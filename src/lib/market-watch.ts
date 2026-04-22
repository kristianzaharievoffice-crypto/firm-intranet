export type MarketInstrumentType = 'stock' | 'forex' | 'crypto'

export interface MarketInstrument {
  symbol: string
  label: string
  type: MarketInstrumentType
}

export interface MarketQuote {
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

export const DEFAULT_MARKET_WATCHLIST: MarketInstrument[] = [
  { symbol: 'EUR/USD', label: 'EUR/USD', type: 'forex' },
  { symbol: 'GBP/USD', label: 'GBP/USD', type: 'forex' },
  { symbol: 'XAU/USD', label: 'Gold', type: 'forex' },
  { symbol: 'AAPL', label: 'Apple', type: 'stock' },
  { symbol: 'MSFT', label: 'Microsoft', type: 'stock' },
  { symbol: 'TSLA', label: 'Tesla', type: 'stock' },
  { symbol: 'BTC/USD', label: 'Bitcoin', type: 'crypto' },
]

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

interface TwelveDataQuoteResponse {
  symbol?: string
  name?: string
  exchange?: string
  currency?: string
  datetime?: string
  timestamp?: number
  close?: string
  price?: string
  previous_close?: string
  percent_change?: string
  change?: string
  is_market_open?: boolean | string
  status?: string
  code?: number
  message?: string
}

export async function fetchMarketQuotes(
  instruments: MarketInstrument[] = DEFAULT_MARKET_WATCHLIST
): Promise<MarketQuote[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY

  if (!apiKey) {
    return instruments.map((instrument) => ({
      ...instrument,
      price: null,
      change: null,
      percentChange: null,
      currency: null,
      exchange: null,
      timestamp: null,
      isMarketOpen: null,
      error: 'Missing TWELVE_DATA_API_KEY',
    }))
  }

  const results = await Promise.all(
    instruments.map(async (instrument): Promise<MarketQuote> => {
      const url = new URL('https://api.twelvedata.com/quote')
      url.searchParams.set('symbol', instrument.symbol)
      url.searchParams.set('apikey', apiKey)

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          return {
            ...instrument,
            price: null,
            change: null,
            percentChange: null,
            currency: null,
            exchange: null,
            timestamp: null,
            isMarketOpen: null,
            error: `HTTP ${response.status}`,
          }
        }

        const data = (await response.json()) as TwelveDataQuoteResponse

        if (data.status === 'error') {
          return {
            ...instrument,
            price: null,
            change: null,
            percentChange: null,
            currency: null,
            exchange: null,
            timestamp: null,
            isMarketOpen: null,
            error: data.message ?? 'Unknown provider error',
          }
        }

        return {
          symbol: instrument.symbol,
          label: instrument.label,
          type: instrument.type,
          price: toNumber(data.price ?? data.close),
          change: toNumber(data.change),
          percentChange: toNumber(data.percent_change),
          currency: data.currency ?? null,
          exchange: data.exchange ?? null,
          timestamp:
            data.datetime ??
            (typeof data.timestamp === 'number'
              ? new Date(data.timestamp * 1000).toISOString()
              : null),
          isMarketOpen: toBoolean(data.is_market_open),
          error: null,
        }
      } catch (error) {
        return {
          ...instrument,
          price: null,
          change: null,
          percentChange: null,
          currency: null,
          exchange: null,
          timestamp: null,
          error:
            error instanceof Error ? error.message : 'Unknown fetch error',
          isMarketOpen: null,
        }
      }
    })
  )

  return results
}
