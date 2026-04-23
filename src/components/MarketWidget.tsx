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

function formatChange(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

function formatPercent(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function typeLabel(type: MarketInstrumentType) {
  if (type === 'forex') return 'Forex'
  if (type === 'crypto') return 'Crypto'
  return 'Stock'
}

export default function MarketWidget() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadQuotes = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await fetch('/api/market', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to load market data (${response.status})`)
      }

      const data = (await response.json()) as MarketApiResponse
      setQuotes(Array.isArray(data.quotes) ? data.quotes : [])
      setUpdatedAt(data.updatedAt ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadQuotes(true)

    const interval = window.setInterval(() => {
      void loadQuotes(false)
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loadQuotes])

  const hasAnyData = useMemo(
    () => quotes.some((item) => item.price !== null),
    [quotes]
  )

  return (
    <section className="rounded-2xl border border-yellow-200/60 bg-white/95 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-yellow-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Live Market Watch
          </h2>
          <p className="text-sm text-neutral-600">
            Real-time watchlist for forex, stocks and crypto
          </p>
        </div>

        <div className="flex items-center gap-3">
          {updatedAt ? (
            <span className="text-xs text-neutral-500">
              Updated: {new Date(updatedAt).toLocaleTimeString('en-GB')}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => void loadQuotes(false)}
            className="inline-flex items-center rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:brightness-105"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-sm text-neutral-500">
          Loading market data...
        </div>
      ) : error && !hasAnyData ? (
        <div className="px-5 py-8 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((item) => {
            const positive = (item.percentChange ?? 0) > 0
            const negative = (item.percentChange ?? 0) < 0

            return (
              <article
                key={item.symbol}
                className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/70 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-neutral-900">
                      {item.label}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {item.symbol}
                      {item.exchange ? ` • ${item.exchange}` : ''}
                    </div>
                  </div>

                  <span className="rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-700">
                    {typeLabel(item.type)}
                  </span>
                </div>

                <div className="mb-2 text-2xl font-bold text-neutral-950">
                  {formatPrice(item.price)}
                </div>

                <div
                  className={[
                    'text-sm font-medium',
                    positive ? 'text-emerald-600' : '',
                    negative ? 'text-red-600' : '',
                    !positive && !negative ? 'text-neutral-500' : '',
                  ].join(' ')}
                >
                  {formatChange(item.change)} ({formatPercent(item.percentChange)})
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {item.currency ? (
                    <span className="rounded-full bg-white px-2 py-1 ring-1 ring-yellow-100">
                      {item.currency}
                    </span>
                  ) : null}

                  {item.isMarketOpen !== null ? (
                    <span className="rounded-full bg-white px-2 py-1 ring-1 ring-yellow-100">
                      {item.isMarketOpen ? 'Market open' : 'Market closed'}
                    </span>
                  ) : null}
                </div>

                {item.error ? (
                  <div className="mt-3 text-xs text-red-600">{item.error}</div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
