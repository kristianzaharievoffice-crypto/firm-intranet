'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'

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

type WhiteboardElement =
  | StrokeElement
  | LineElement
  | RectangleElement
  | CircleElement
  | TextElement

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
  event: React.PointerEvent<SVGSVGElement>,
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

export default function PersonalWhiteboardLauncher({
  userId,
}: {
  userId: string
}) {
  const supabase = useMemo(() => createClient(), [])

  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#111827')
  const [strokeSize, setStrokeSize] = useState(3)
  const [elements, setElements] = useState<WhiteboardElement[]>([])
  const [history, setHistory] = useState<WhiteboardElement[][]>([])
  const [future, setFuture] = useState<WhiteboardElement[][]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusText, setStatusText] = useState('')

  const svgRef = useRef<SVGSVGElement | null>(null)
  const draftElementRef = useRef<WhiteboardElement | null>(null)
  const drawStartPointRef = useRef<Point | null>(null)
  const isDrawingRef = useRef(false)
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

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setHistory((prev) => {
          if (!prev.length) return prev
          const previous = prev[prev.length - 1]
          setFuture((current) => [elements, ...current])
          setElements(previous)
          setIsDirty(true)
          return prev.slice(0, -1)
        })
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === 'y' ||
          (event.shiftKey && event.key.toLowerCase() === 'z'))
      ) {
        event.preventDefault()
        setFuture((prev) => {
          if (!prev.length) return prev
          const next = prev[0]
          setHistory((current) => [...current, elements])
          setElements(next)
          setIsDirty(true)
          return prev.slice(1)
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [elements, isOpen])

  const beginDraw = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

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
    }
  }

  const moveDraw = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || !isDrawingRef.current || !draftElementRef.current) return

    const point = pointToSvgPoint(event, svgRef.current)
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

  const endDraw = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    draftElementRef.current = null
    drawStartPointRef.current = null
    setIsDirty(true)
  }

  const undo = () => {
    setHistory((prev) => {
      if (!prev.length) return prev
      const previous = prev[prev.length - 1]
      setFuture((current) => [elements, ...current])
      setElements(previous)
      setIsDirty(true)
      return prev.slice(0, -1)
    })
  }

  const redo = () => {
    setFuture((prev) => {
      if (!prev.length) return prev
      const next = prev[0]
      setHistory((current) => [...current, elements])
      setElements(next)
      setIsDirty(true)
      return prev.slice(1)
    })
  }

  const clearBoard = () => {
    const ok = window.confirm('Clear the whole board?')
    if (!ok) return
    pushHistory(elements)
    setElements([])
    setIsDirty(true)
  }

  const renderElement = (element: WhiteboardElement) => {
    if (element.type === 'stroke') {
      return (
        <path
          key={element.id}
          d={strokePath(element.points)}
          fill="none"
          stroke={element.color}
          strokeWidth={element.size}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    if (element.type === 'line') {
      return (
        <line
          key={element.id}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          stroke={element.color}
          strokeWidth={element.size}
          strokeLinecap="round"
        />
      )
    }

    if (element.type === 'rectangle') {
      return (
        <rect
          key={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="none"
          stroke={element.color}
          strokeWidth={element.size}
          rx={8}
        />
      )
    }

    if (element.type === 'circle') {
      return (
        <ellipse
          key={element.id}
          cx={element.cx}
          cy={element.cy}
          rx={element.rx}
          ry={element.ry}
          fill="none"
          stroke={element.color}
          strokeWidth={element.size}
        />
      )
    }

    return (
      <text
        key={element.id}
        x={element.x}
        y={element.y}
        fill={element.color}
        fontSize={element.size}
        fontFamily="Arial, sans-serif"
      >
        {element.text}
      </text>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-300 bg-gradient-to-br from-yellow-400 to-amber-300 text-xl font-semibold text-neutral-900 shadow-lg transition hover:scale-105"
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
                  Personal Whiteboard
                </div>
                <div className="text-xs text-neutral-500">
                  Private board saved only for your profile
                </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
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
              <div>
                Tool: <span className="font-medium text-neutral-700">{tool}</span>
              </div>
              <div>{statusText}</div>
            </div>

            <div className="relative flex-1 bg-neutral-50">
              <svg
                ref={svgRef}
                className="h-full w-full touch-none bg-white"
                onPointerDown={beginDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
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