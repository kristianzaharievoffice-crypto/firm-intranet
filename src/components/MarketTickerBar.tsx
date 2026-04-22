'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type MarketInstrumentType = 'forex' | 'commodity'

interface MarketQuote {
  key: string
  label: string
  type: MarketInstrumentType
  price: number | null
  currency?: string | null
  updatedAt?: string | null
  error?: string | null
}

interface MarketApiResponse {
  quotes: MarketQuote[]
  updatedAt: string
}

function formatPrice(value: number | null) {
  if (value === null) return '—'

  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

function buildTickerText(quotes: MarketQuote[]) {
  return quotes
    .map((item) => `${item.label} ${formatPrice(item.price)}`)
    .join('   •   ')
}

export default function MarketTickerBar() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const loadQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/market', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to load market data (${response.status})`)
      }

      const data = (await response.json()) as MarketApiResponse

      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setQuotes(data.quotes)
        setUpdatedAt(data.updatedAt ?? null)
        setHasLoadedOnce(true)
        setError(null)
      } else if (!hasLoadedOnce) {
        setQuotes([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data')
    }
  }, [hasLoadedOnce])

  useEffect(() => {
    void loadQuotes()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadQuotes()
      }
    }, 15 * 60 * 1000)

    return () => window.clearInterval(interval)
  }, [loadQuotes])

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current

    if (!viewport || !content) return

    const updateSizes = () => {
      setContainerWidth(viewport.offsetWidth)
      setContentWidth(content.scrollWidth)
    }

    updateSizes()

    const observer = new ResizeObserver(() => {
      updateSizes()
    })

    observer.observe(viewport)
    observer.observe(content)

    window.addEventListener('resize', updateSizes)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSizes)
    }
  }, [quotes])

  const tickerText = useMemo(() => buildTickerText(quotes), [quotes])

  const startX = containerWidth
  const endX = -contentWidth
  const distance = Math.max(0, startX + contentWidth)
  const durationSeconds = Math.max(18, distance / 55)

  return (
    <div className="sticky top-0 z-40 border-b border-yellow-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="relative flex items-center gap-3 px-3 py-2 sm:px-4 xl:px-6">
        <div className="shrink-0 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
          Live Markets
        </div>

        <div
          ref={viewportRef}
          className="relative min-w-0 flex-1 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 to-transparent" />

          {tickerText ? (
            <div
              ref={contentRef}
              className="ticker-text absolute left-0 top-1/2 w-max -translate-y-1/2 whitespace-nowrap text-sm font-medium text-neutral-800"
              style={
                {
                  ['--ticker-start' as string]: `${startX}px`,
                  ['--ticker-end' as string]: `${endX}px`,
                  animationDuration: `${durationSeconds}s`,
                } as React.CSSProperties
              }
            >
              {tickerText}
            </div>
          ) : (
            <div className="text-sm text-neutral-500">
              {error && !hasLoadedOnce
                ? 'Market data is temporarily unavailable'
                : 'Loading market data...'}
            </div>
          )}
        </div>

        <div className="hidden shrink-0 text-xs text-neutral-500 sm:block">
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-GB')}` : ''}
        </div>
      </div>

      <style jsx>{`
        .ticker-text {
          will-change: transform;
          animation-name: ticker-slide;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .ticker-text:hover {
          animation-play-state: paused;
        }

        @keyframes ticker-slide {
          0% {
            transform: translate3d(var(--ticker-start), -50%, 0);
          }
          100% {
            transform: translate3d(var(--ticker-end), -50%, 0);
          }
        }
      `}</style>
    </div>
  )
}