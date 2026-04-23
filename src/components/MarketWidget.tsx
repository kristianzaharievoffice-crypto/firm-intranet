'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import CurrencyConverterWidget from '@/components/CurrencyConverterWidget'

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

  if (value >= 1000) {
    return value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (value >= 1) {
    return value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  return value.toLocaleString('en-GB', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

function formatChange(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(4)}`
}

function formatPercent(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-yellow-200/60 bg-white/95 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-yellow-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Live FX Market Watch
            </h2>
            <p className="text-sm text-neutral-600">
              Live forex pairs already connected to your dashboard.
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
          <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
            {quotes.map((item) => {
              const positive = (item.percentChange ?? 0) > 0
              const negative = (item.percentChange ?? 0) < 0

              return (
                <article
                  key={item.key}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">
                        {item.label}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
                        Forex pair
                      </p>
                    </div>

                    {item.currency ? (
                      <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600">
                        {item.currency}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="text-2xl font-semibold tracking-tight text-neutral-900">
                      {formatPrice(item.price)}
                    </p>

                    <p
                      className={[
                        'mt-2 text-sm font-medium',
                        positive ? 'text-emerald-600' : '',
                        negative ? 'text-red-600' : '',
                        !positive && !negative ? 'text-neutral-500' : '',
                      ].join(' ')}
                    >
                      {formatChange(item.change)} ({formatPercent(item.percentChange)})
                    </p>
                  </div>

                  {item.error ? (
                    <p className="mt-3 text-xs text-red-600">{item.error}</p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <CurrencyConverterWidget />
    </div>
  )
}
