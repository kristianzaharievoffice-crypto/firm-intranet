'use client'

import { useEffect, useMemo, useState } from 'react'

type ConverterResponse = {
  amount: number
  from: string
  to: string
  rate: number
  result: number
  date: string
  error?: string
}

const CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'BGN',
  'CHF',
  'JPY',
  'AUD',
  'CAD',
  'NZD',
  'TRY',
  'RON',
  'PLN',
] as const

function formatNumber(value: number) {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export default function CurrencyConverterLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ConverterResponse | null>(null)

  const canConvert = useMemo(() => {
    const numericAmount = Number(amount)
    return Number.isFinite(numericAmount) && numericAmount > 0 && from && to
  }, [amount, from, to])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  async function handleConvert() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        amount,
        from,
        to,
      })

      const response = await fetch(`/api/currency-converter?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const json = (await response.json()) as ConverterResponse | { error?: string }

      if (!response.ok) {
        throw new Error(
          'error' in json && json.error ? json.error : 'Failed to convert currency.'
        )
      }

      setData(json as ConverterResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert currency.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSwap() {
    setFrom(to)
    setTo(from)
    setData(null)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-24 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-blue-300 bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-semibold text-white shadow-lg transition hover:scale-105"
        title="Open currency converter"
      >
        $
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-blue-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                  Currency Converter
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Convert currencies live inside your intranet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-700">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setData(null)
                    setError(null)
                  }}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="100"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-700">From</span>
                <select
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setData(null)
                    setError(null)
                  }}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-700">To</span>
                <select
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setData(null)
                    setError(null)
                  }}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col justify-end gap-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!canConvert || loading}
                  className="inline-flex items-center justify-center rounded-2xl border border-blue-300 bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Converting...' : 'Convert'}
                </button>

                <button
                  type="button"
                  onClick={handleSwap}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Swap
                </button>
              </div>
            </div>

            <div className="border-t border-blue-100 px-5 py-5 sm:px-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : data ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Converted result
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-neutral-900">
                      {formatNumber(data.result)} {data.to}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      {formatNumber(data.amount)} {data.from} = {formatNumber(data.result)} {data.to}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Exchange rate
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-neutral-900">
                      1 {data.from} = {formatNumber(data.rate)} {data.to}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      Rate date: {data.date}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                  Enter amount, choose currencies, then click Convert.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
