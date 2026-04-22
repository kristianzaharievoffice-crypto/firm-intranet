'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type MarketInstrumentType = 'stock' | 'forex' | 'crypto'

interface MarketQuote {
  symbol: string
  label: string
  type: MarketInstrumentType
  price: number | null
  change: number | null
  percentChange: number | null
  currency?: string | null
  exchange?: string | null
  timestamp?: string | null
  isMarketOpen?: boolean | null
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

function formatPercent(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function typeDotClass(type: MarketInstrumentType) {
  if (type === 'forex') return 'bg-blue-500'
  if (type === 'crypto') return 'bg-violet-500'
  return 'bg-amber-500'
}

function changeClass(value: number | null) {
  if (value === null) return 'text-neutral-500'
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-red-600'
  return 'text-neutral-500'
}

function TickerRow({ quotes }: { quotes: MarketQuote[] }) {
  return (
    <>
      {quotes.map((item, index) => (
        <div
          key={`${item.symbol}-${index}`}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap pr-8 text-sm"
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${typeDotClass(item.type)}`}
          />

          <span className="font-semibold text-neutral-900">
            {item.label}
          </span>

          <span className="text-neutral-700">
            {formatPrice(item.price)}
          </span>

          <span className={changeClass(item.percentChange)}>
            {formatPercent(item.percentChange)}
          </span>
        </div>
      ))}
    </>
  )
}

export default function MarketTickerBar() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const validQuotes = Array.isArray(data.quotes)
        ? data.quotes.filter((q) => !q.error)
        : []

      if (validQuotes.length > 0) {
        setQuotes(validQuotes)
        setUpdatedAt(data.updatedAt ?? null)
        setHasLoadedOnce(true)
        setError(null)
      } else if (!hasLoadedOnce) {
        setQuotes([])
        setUpdatedAt(data.updatedAt ?? null)
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
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loadQuotes])

  const hasQuotes = quotes.length > 0

  const loopQuotes = useMemo(() => {
    if (!hasQuotes) return []
    return [...quotes, ...quotes, ...quotes]
  }, [quotes, hasQuotes])

  return (
    <div className="sticky top-0 z-40 border-b border-yellow-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="relative flex items-center gap-3 border-b border-yellow-100/80 px-3 py-2 sm:px-4 xl:px-6">
        <div className="shrink-0 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
          Live Markets
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {hasQuotes ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 to-transparent" />

              <div className="market-ticker-track flex min-w-max items-center">
                <TickerRow quotes={loopQuotes} />
              </div>
            </>
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
        .market-ticker-track {
          animation: marketTickerScroll 55s linear infinite;
          width: max-content;
          will-change: transform;
        }

        .market-ticker-track:hover {
          animation-play-state: paused;
        }

        @keyframes marketTickerScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.3333%, 0, 0);
          }
        }
      `}</style>
    </div>
  )
}
