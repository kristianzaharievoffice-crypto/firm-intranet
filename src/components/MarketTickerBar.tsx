'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type MarketInstrumentType = 'forex'

interface MarketQuote {
  key: string
  label: string
  type: MarketInstrumentType
  price: number | null
  previousPrice: number | null
  change: number | null
  percentChange: number | null
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

  if (value >= 100) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })
  }

  if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 5,
  })
}

function formatPercent(value: number | null) {
  if (value === null) return ''
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function changeColor(value: number | null) {
  if (value === null) return 'text-neutral-500'
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-red-600'
  return 'text-neutral-500'
}

function isRenderable(item: MarketQuote) {
  return item.price !== null
}

const FALLBACK_QUOTES: MarketQuote[] = [
  {
    key: 'usd-jpy',
    label: 'USD/JPY',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
  {
    key: 'eur-usd',
    label: 'EUR/USD',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
  {
    key: 'gbp-usd',
    label: 'GBP/USD',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
  {
    key: 'nzd-usd',
    label: 'NZD/USD',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
  {
    key: 'aud-usd',
    label: 'AUD/USD',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
  {
    key: 'usd-chf',
    label: 'USD/CHF',
    type: 'forex',
    price: null,
    previousPrice: null,
    change: null,
    percentChange: null,
  },
]

export default function MarketTickerBar() {
  const [quotes, setQuotes] = useState<MarketQuote[]>(FALLBACK_QUOTES)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
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

      if (!response.ok) return

      const data = (await response.json()) as MarketApiResponse

      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setQuotes(data.quotes)
        setUpdatedAt(data.updatedAt ?? null)
      }
    } catch {
      // keep last successful data
    }
  }, [])

  useEffect(() => {
    void loadQuotes()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadQuotes()
      }
    }, 60 * 60 * 1000)

    return () => window.clearInterval(interval)
  }, [loadQuotes])

  const visibleQuotes = useMemo(
    () => quotes.filter(isRenderable),
    [quotes]
  )

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
  }, [visibleQuotes])

  const startX = containerWidth
  const endX = -contentWidth
  const distance = Math.max(0, containerWidth + contentWidth)
  const durationSeconds = Math.max(18, distance / 70)

  return (
    <div className="sticky top-0 z-40 border-b border-yellow-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="relative flex items-center gap-3 px-3 py-2.5 sm:px-4 xl:px-6">
        <div className="shrink-0 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
          Live Markets
        </div>

        <div
          ref={viewportRef}
          className="relative h-8 min-w-0 flex-1 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 to-transparent" />

          <div
            ref={contentRef}
            className="ticker-strip absolute left-0 top-0 flex h-8 items-center gap-5 whitespace-nowrap"
            style={
              {
                ['--ticker-start' as string]: `${startX}px`,
                ['--ticker-end' as string]: `${endX}px`,
                animationDuration: `${durationSeconds}s`,
              } as React.CSSProperties
            }
          >
            {(visibleQuotes.length ? visibleQuotes : FALLBACK_QUOTES).map((item) => (
              <div
                key={item.key}
                className="flex shrink-0 items-center gap-2 text-sm leading-none"
              >
                <span className="font-semibold text-neutral-900">
                  {item.label}
                </span>

                <span className="text-neutral-800">
                  {formatPrice(item.price)}
                </span>

                {item.percentChange !== null ? (
                  <span className={changeColor(item.percentChange)}>
                    {formatPercent(item.percentChange)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 text-xs text-neutral-500 sm:block">
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-GB')}` : 'FX ribbon'}
        </div>
      </div>

      <style jsx>{`
        .ticker-strip {
          width: max-content;
          will-change: transform;
          animation-name: ticker-slide;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .ticker-strip:hover {
          animation-play-state: paused;
        }

        @keyframes ticker-slide {
          0% {
            transform: translate3d(var(--ticker-start), 0, 0);
          }
          100% {
            transform: translate3d(var(--ticker-end), 0, 0);
          }
        }
      `}</style>
    </div>
  )
}