'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tool =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'sticky'

type Point = {
  x: number
  y: number
}

type BaseElement = {
  id: string
  color: string
}

type StrokeElement = BaseElement & {
  type: 'stroke'
  points: Point[]
  size: number
}

type LineElement = BaseElement & {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  size: number
}

type RectangleElement = BaseElement & {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  size: number
}

type CircleElement = BaseElement & {
  type: 'circle'
  cx: number
  cy: number
  rx: number
  ry: number
  size: number
}

type TextElement = BaseElement & {
  type: 'text'
  x: number
  y: number
  text: string
  size: number
}

type StickyNoteElement = BaseElement & {
  type: 'sticky'
  x: number
  y: number
  width: number
  height: number
  text: string
  textColor: string
}

type WhiteboardElement =
  | StrokeElement
  | LineElement
  | RectangleElement
  | CircleElement
  | TextElement
  | StickyNoteElement

type BoardState = {
  elements: WhiteboardElement[]
}

type WhiteboardRow = {
  user_id: string
  board_data: BoardState | null
  updated_at?: string | null
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function clampSize(value: number) {
  return Math.max(1, Math.min(24, value))
}

function pointToSvgPoint(
  event: React.PointerEvent<SVGSVGElement> | React.PointerEvent<SVGGElement>,
  svg: SVGSVGElement
) {
  const rect = svg.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function strokePath(points: Point[]) {
  if (!points.length) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  return { x, y, width, height }
}

function normalizeCircle(x1: number, y1: number, x2: number, y2: number) {
  return {
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    rx: Math.abs(x2 - x1) / 2,
    ry: Math.abs(y2 - y1) / 2,
  }
}

function getElementBounds(element: WhiteboardElement) {
  if (element.type === 'stroke') {
    const xs = element.points.map((p) => p.x)
    const ys = element.points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      x: minX - element.size,
      y: minY - element.size,
      width: maxX - minX + element.size * 2,
      height: maxY - minY + element.size * 2,
    }
  }

  if (element.type === 'line') {
    const minX = Math.min(element.x1, element.x2)
    const maxX = Math.max(element.x1, element.x2)
    const minY = Math.min(element.y1, element.y2)
    const maxY = Math.max(element.y1, element.y2)

    return {
      x: minX - element.size,
      y: minY - element.size,
      width: maxX - minX + element.size * 2,
      height: maxY - minY + element.size * 2,
    }
  }

  if (element.type === 'rectangle') {
    return {
      x: element.x - element.size,
      y: element.y - element.size,
      width: element.width + element.size * 2,
      height: element.height + element.size * 2,
    }
  }

  if (element.type === 'circle') {
    return {
      x: element.cx - element.rx - element.size,
      y: element.cy - element.ry - element.size,
      width: element.rx * 2 + element.size * 2,
      height: element.ry * 2 + element.size * 2,
    }
  }

  if (element.type === 'text') {
    return {
      x: element.x - 6,
      y: element.y - element.size,
      width: Math.max(60, element.text.length * (element.size * 0.6)),
      height: element.size + 10,
    }
  }

  return {
    x: element.x - 6,
    y: element.y - 6,
    width: element.width + 12,
    height: element.height + 12,
  }
}

function moveElement(element: WhiteboardElement, dx: number, dy: number): WhiteboardElement {
  if (element.type === 'stroke') {
    return {
      ...element,
      points: element.points.map((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      })),
    }
  }

  if (element.type === 'line') {
    return {
      ...element,
      x1: element.x1 + dx,
      y1: element.y1 + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
    }
  }

  if (element.type === 'rectangle') {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
    }
  }

  if (element.type === 'circle') {
    return {
      ...element,
      cx: element.cx + dx,
      cy: element.cy + dy,
    }
  }

  if (element.type === 'text') {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
    }
  }

  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  }
}

export default function PersonalWhiteboardLauncher({
  userId,
}: {
  userId: string
}) {
  const pathname = usePathname()
  const isChatPage = pathname === '/chat' || pathname.startsWith('/chat/')
  const supabase = useMemo(() => createClient(), [])

  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#111827')
  const [strokeSize, setStrokeSize] = useState(3)
  const [elements, setElements] = useState<WhiteboardElement[]>([])
  const [history, setHistory] = useState<WhiteboardElement[][]>([])
  const [future, setFuture] = useState<WhiteboardElement[][]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusText, setStatusText] = useState('')

  const svgRef = useRef<SVGSVGElement | null>(null)
  const draftElementRef = useRef<WhiteboardElement | null>(null)
  const drawStartPointRef = useRef<Point | null>(null)
  const isDrawingRef = useRef(false)
  const isMovingRef = useRef(false)
  const moveStartPointRef = useRef<Point | null>(null)
  const movingElementIdRef = useRef<string | null>(null)
  const movingOriginalElementRef = useRef<WhiteboardElement | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const pushHistory = useCallback((snapshot: WhiteboardElement[]) => {
    setHistory((prev) => [...prev, snapshot])
    setFuture([])
  }, [])

  const loadBoard = useCallback(async () => {
    setStatusText('Loading board...')

    const { data, error } = await supabase
      .from('personal_whiteboards')
      .select('user_id, board_data, updated_at')
      .eq('user_id', userId)
      .maybeSingle<WhiteboardRow>()

    if (error) {
      setStatusText('Could not load board')
      setIsLoaded(true)
      return
    }

    const loadedElements = Array.isArray(data?.board_data?.elements)
      ? (data?.board_data?.elements as WhiteboardElement[])
      : []

    setElements(loadedElements)
    setHistory([])
    setFuture([])
    setSelectedElementId(null)
    setIsDirty(false)
    setStatusText(data?.updated_at ? 'Board loaded' : 'New board ready')
    setIsLoaded(true)
  }, [supabase, userId])

  const saveBoard = useCallback(async () => {
    setIsSaving(true)
    setStatusText('Saving...')

    const payload: BoardState = {
      elements,
    }

    const { error } = await supabase.from('personal_whiteboards').upsert(
      {
        user_id: userId,
        board_data: payload,
      },
      {
        onConflict: 'user_id',
      }
    )

    if (error) {
      setStatusText('Save failed')
      setIsSaving(false)
      return
    }

    setIsDirty(false)
    setIsSaving(false)
    setStatusText('Saved')
  }, [elements, supabase, userId])

  useEffect(() => {
    if (!isOpen || isLoaded) return
    void loadBoard()
  }, [isOpen, isLoaded, loadBoard])

  useEffect(() => {
    if (!isOpen || !isLoaded) return
    if (!isDirty) return

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveBoard()
    }, 1200)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [elements, isDirty, isLoaded, isOpen, saveBoard])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev
      const previous = prev[prev.length - 1]
      setFuture((current) => [elements, ...current])
      setElements(previous)
      setSelectedElementId(null)
      setIsDirty(true)
      return prev.slice(0, -1)
    })
  }, [elements])

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (!prev.length) return prev
      const next = prev[0]
      setHistory((current) => [...current, elements])
      setElements(next)
      setSelectedElementId(null)
      setIsDirty(true)
      return prev.slice(1)
    })
  }, [elements])

  const deleteSelected = useCallback(() => {
    if (!selectedElementId) return
    pushHistory(elements)
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId))
    setSelectedElementId(null)
    setIsDirty(true)
  }, [elements, pushHistory, selectedElementId])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveBoard()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === 'y' ||
          (event.shiftKey && event.key.toLowerCase() === 'z'))
      ) {
        event.preventDefault()
        redo()
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedElementId) {
          event.preventDefault()
          deleteSelected()
        }
      }

      if (event.key.toLowerCase() === 'v') setTool('select')
      if (event.key.toLowerCase() === 'p') setTool('pen')
      if (event.key.toLowerCase() === 'e') setTool('eraser')
      if (event.key.toLowerCase() === 'l') setTool('line')
      if (event.key.toLowerCase() === 'r') setTool('rectangle')
      if (event.key.toLowerCase() === 'c') setTool('circle')
      if (event.key.toLowerCase() === 't') setTool('text')
      if (event.key.toLowerCase() === 'n') setTool('sticky')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelected, isOpen, redo, saveBoard, selectedElementId, undo])

  const beginMoveElement = (
    event: React.PointerEvent<SVGGElement>,
    element: WhiteboardElement
  ) => {
    if (tool !== 'select' || !svgRef.current) return

    event.stopPropagation()

    const point = pointToSvgPoint(event, svgRef.current)

    pushHistory(elements)
    setSelectedElementId(element.id)

    isMovingRef.current = true
    moveStartPointRef.current = point
    movingElementIdRef.current = element.id
    movingOriginalElementRef.current = element
  }

  const editElementText = (element: WhiteboardElement) => {
    if (element.type !== 'text' && element.type !== 'sticky') return

    const nextText = window.prompt(
      element.type === 'sticky' ? 'Edit sticky note text' : 'Edit text',
      element.text
    )



    if (nextText === null) return

    pushHistory(elements)

    setElements((prev) =>
      prev.map((item) =>
        item.id === element.id
          ? {
              ...item,
              text: nextText.trim(),
            }
          : item
      )
    )

    setSelectedElementId(element.id)
    setIsDirty(true)
  }

  const beginDraw = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    if (tool === 'select') {
      setSelectedElementId(null)
      return
    }

    const point = pointToSvgPoint(event, svgRef.current)

    if (tool === 'text') {
      const text = window.prompt('Enter text')
      if (!text || !text.trim()) return

      pushHistory(elements)

      const textElement: TextElement = {
        id: uid(),
        type: 'text',
        x: point.x,
        y: point.y,
        text: text.trim(),
        color,
        size: Math.max(14, strokeSize * 6),
      }

      setElements((prev) => [...prev, textElement])
      setSelectedElementId(textElement.id)
      setIsDirty(true)
      return
    }

    if (tool === 'sticky') {
      const text = window.prompt('Enter sticky note text')
      if (!text || !text.trim()) return

      pushHistory(elements)

      const sticky: StickyNoteElement = {
        id: uid(),
        type: 'sticky',
        x: point.x,
        y: point.y,
        width: 220,
        height: 140,
        text: text.trim(),
        color: '#FDE68A',
        textColor: '#111827',
      }

      setElements((prev) => [...prev, sticky])
      setSelectedElementId(sticky.id)
      setIsDirty(true)
      return
    }

    pushHistory(elements)
    isDrawingRef.current = true
    drawStartPointRef.current = point

    if (tool === 'pen' || tool === 'eraser') {
      const stroke: StrokeElement = {
        id: uid(),
        type: 'stroke',
        points: [point],
        color: tool === 'eraser' ? '#ffffff' : color,
        size: tool === 'eraser' ? Math.max(10, strokeSize * 3) : strokeSize,
      }

      draftElementRef.current = stroke
      setElements((prev) => [...prev, stroke])
      setSelectedElementId(stroke.id)
      return
    }

    if (tool === 'line') {
      const line: LineElement = {
        id: uid(),
        type: 'line',
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        color,
        size: strokeSize,
      }

      draftElementRef.current = line
      setElements((prev) => [...prev, line])
      setSelectedElementId(line.id)
      return
    }

    if (tool === 'rectangle') {
      const rect: RectangleElement = {
        id: uid(),
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color,
        size: strokeSize,
      }

      draftElementRef.current = rect
      setElements((prev) => [...prev, rect])
      setSelectedElementId(rect.id)
      return
    }

    if (tool === 'circle') {
      const circle: CircleElement = {
        id: uid(),
        type: 'circle',
        cx: point.x,
        cy: point.y,
        rx: 0,
        ry: 0,
        color,
        size: strokeSize,
      }

      draftElementRef.current = circle
      setElements((prev) => [...prev, circle])
      setSelectedElementId(circle.id)
    }
  }

  const movePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    const point = pointToSvgPoint(event, svgRef.current)

    if (isMovingRef.current && movingElementIdRef.current && moveStartPointRef.current && movingOriginalElementRef.current) {
      const start = moveStartPointRef.current
      const original = movingOriginalElementRef.current
      const dx = point.x - start.x
      const dy = point.y - start.y

      setElements((prev) =>
        prev.map((item) =>
          item.id === movingElementIdRef.current ? moveElement(original, dx, dy) : item
        )
      )

      return
    }

    if (!isDrawingRef.current || !draftElementRef.current) return

    const draft = draftElementRef.current
    const start = drawStartPointRef.current

    setElements((prev) => {
      const next = [...prev]
      const index = next.findIndex((item) => item.id === draft.id)
      if (index === -1) return prev

      const current = next[index]

      if (current.type === 'stroke') {
        next[index] = {
          ...current,
          points: [...current.points, point],
        }
        draftElementRef.current = next[index]
        return next
      }

      if (current.type === 'line') {
        next[index] = {
          ...current,
          x2: point.x,
          y2: point.y,
        }
        draftElementRef.current = next[index]
        return next
      }

      if (current.type === 'rectangle' && start) {
        const normalized = normalizeRect(start.x, start.y, point.x, point.y)
        next[index] = {
          ...current,
          ...normalized,
        }
        draftElementRef.current = next[index]
        return next
      }

      if (current.type === 'circle' && start) {
        const normalized = normalizeCircle(start.x, start.y, point.x, point.y)
        next[index] = {
          ...current,
          ...normalized,
        }
        draftElementRef.current = next[index]
        return next
      }

      return prev
    })
  }

  const endPointer = () => {
    const wasDrawing = isDrawingRef.current
    const wasMoving = isMovingRef.current

    isDrawingRef.current = false
    draftElementRef.current = null
    drawStartPointRef.current = null

    isMovingRef.current = false
    moveStartPointRef.current = null
    movingElementIdRef.current = null
    movingOriginalElementRef.current = null

    if (wasDrawing || wasMoving) {
      setIsDirty(true)
    }
  }

  const clearBoard = () => {
    const ok = window.confirm('Clear the whole board?')
    if (!ok) return
    pushHistory(elements)
    setElements([])
    setSelectedElementId(null)
    setIsDirty(true)
  }

  const renderElement = (element: WhiteboardElement) => {
    const isSelected = selectedElementId === element.id
    const bounds = isSelected ? getElementBounds(element) : null

    return (
      <g
        key={element.id}
        onPointerDown={(event) => beginMoveElement(event, element)}
        onDoubleClick={() => editElementText(element)}
        style={{ cursor: tool === 'select' ? 'move' : 'default' }}
      >
        {element.type === 'stroke' ? (
          <path
            d={strokePath(element.points)}
            fill="none"
            stroke={element.color}
            strokeWidth={element.size}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {element.type === 'line' ? (
          <line
            x1={element.x1}
            y1={element.y1}
            x2={element.x2}
            y2={element.y2}
            stroke={element.color}
            strokeWidth={element.size}
            strokeLinecap="round"
          />
        ) : null}

        {element.type === 'rectangle' ? (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill="none"
            stroke={element.color}
            strokeWidth={element.size}
            rx={8}
          />
        ) : null}

        {element.type === 'circle' ? (
          <ellipse
            cx={element.cx}
            cy={element.cy}
            rx={element.rx}
            ry={element.ry}
            fill="none"
            stroke={element.color}
            strokeWidth={element.size}
          />
        ) : null}

        {element.type === 'text' ? (
          <text
            x={element.x}
            y={element.y}
            fill={element.color}
            fontSize={element.size}
            fontFamily="Arial, sans-serif"
          >
            {element.text}
          </text>
        ) : null}

        {element.type === 'sticky' ? (
          <>
            <rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              rx={14}
              fill={element.color}
              stroke="#F59E0B"
              strokeWidth={2}
            />
            <foreignObject
              x={element.x + 12}
              y={element.y + 12}
              width={element.width - 24}
              height={element.height - 24}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize: '14px',
                  lineHeight: '1.35',
                  color: element.textColor,
                  fontFamily: 'Arial, sans-serif',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {element.text}
              </div>
            </foreignObject>
          </>
        ) : null}

        {bounds ? (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={Math.max(bounds.width, 8)}
            height={Math.max(bounds.height, 8)}
            fill="none"
            stroke="#EAB308"
            strokeWidth={2}
            strokeDasharray="6 4"
            rx={10}
            pointerEvents="none"
          />
        ) : null}
      </g>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-300 bg-gradient-to-br from-yellow-400 to-amber-300 text-xl font-semibold text-neutral-900 shadow-lg transition hover:scale-105 ${
          isChatPage ? 'max-md:hidden' : ''
        }`}
        title="Open personal whiteboard"
      >
        ✎
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-3 flex flex-col overflow-hidden rounded-3xl border border-yellow-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 border-b border-yellow-100 px-4 py-3">
              <div>
                <div className="text-lg font-semibold text-neutral-900">
                  Personal Whiteboard v2
                </div>
                <div className="text-xs text-neutral-500">
                  Private board saved only for your profile
                </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTool('select')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'select'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Select
                </button>

                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'pen'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Pen
                </button>

                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'eraser'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Eraser
                </button>

                <button
                  type="button"
                  onClick={() => setTool('line')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'line'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Line
                </button>

                <button
                  type="button"
                  onClick={() => setTool('rectangle')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'rectangle'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Rectangle
                </button>

                <button
                  type="button"
                  onClick={() => setTool('circle')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'circle'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Circle
                </button>

                <button
                  type="button"
                  onClick={() => setTool('text')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'text'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Text
                </button>

                <button
                  type="button"
                  onClick={() => setTool('sticky')}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    tool === 'sticky'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Sticky
                </button>

                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-200 bg-white p-1"
                  title="Choose color"
                />

                <input
                  type="range"
                  min="1"
                  max="24"
                  value={strokeSize}
                  onChange={(e) => setStrokeSize(clampSize(Number(e.target.value)))}
                  className="w-28"
                  title="Brush size"
                />

                <button
                  type="button"
                  onClick={undo}
                  className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                >
                  Undo
                </button>

                <button
                  type="button"
                  onClick={redo}
                  className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                >
                  Redo
                </button>

                <button
                  type="button"
                  onClick={deleteSelected}
                  className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={clearBoard}
                  className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => void saveBoard()}
                  className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 text-sm font-semibold text-neutral-900"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-yellow-100 px-4 py-2 text-xs text-neutral-500">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  Tool: <span className="font-medium text-neutral-700">{tool}</span>
                </div>
                <div>
                  Shortcuts:
                  <span className="ml-1 text-neutral-700">
                    V select, P pen, E eraser, L line, R rectangle, C circle, T text, N sticky
                  </span>
                </div>
              </div>
              <div>{statusText}</div>
            </div>

            <div className="relative flex-1 bg-neutral-50">
              <svg
                ref={svgRef}
                className="h-full w-full touch-none bg-white"
                onPointerDown={beginDraw}
                onPointerMove={movePointer}
                onPointerUp={endPointer}
                onPointerLeave={endPointer}
              >
                {elements.map(renderElement)}
              </svg>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


