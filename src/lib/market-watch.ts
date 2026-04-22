export type MarketInstrumentType = 'forex'

export interface MarketQuote {
  key: string
  label: string
  type: MarketInstrumentType
  price: number | null
  currency?: string | null
  updatedAt?: string | null
  error?: string | null
}

type FrankfurterResponse = {
  amount?: number
  base?: string
  date?: string
  rates?: Record<string, number>
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function invert(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return null
  return 1 / value
}

export async function fetchMarketQuotes(): Promise<MarketQuote[]> {
  try {
    const url = 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=JPY,EUR,GBP,NZD,AUD,CHF'

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = (await response.json()) as FrankfurterResponse
    const rates = data.rates ?? {}

    const usdJpy = safeNumber(rates.JPY)
    const usdEur = safeNumber(rates.EUR)
    const usdGbp = safeNumber(rates.GBP)
    const usdNzd = safeNumber(rates.NZD)
    const usdAud = safeNumber(rates.AUD)
    const usdChf = safeNumber(rates.CHF)

    return [
      {
        key: 'usd-jpy',
        label: 'USD/JPY',
        type: 'forex',
        price: usdJpy,
        currency: 'JPY',
        updatedAt: data.date ?? null,
        error: usdJpy === null ? 'Missing rate' : null,
      },
      {
        key: 'eur-usd',
        label: 'EUR/USD',
        type: 'forex',
        price: invert(usdEur),
        currency: 'USD',
        updatedAt: data.date ?? null,
        error: invert(usdEur) === null ? 'Missing rate' : null,
      },
      {
        key: 'gbp-usd',
        label: 'GBP/USD',
        type: 'forex',
        price: invert(usdGbp),
        currency: 'USD',
        updatedAt: data.date ?? null,
        error: invert(usdGbp) === null ? 'Missing rate' : null,
      },
      {
        key: 'nzd-usd',
        label: 'NZD/USD',
        type: 'forex',
        price: invert(usdNzd),
        currency: 'USD',
        updatedAt: data.date ?? null,
        error: invert(usdNzd) === null ? 'Missing rate' : null,
      },
      {
        key: 'aud-usd',
        label: 'AUD/USD',
        type: 'forex',
        price: invert(usdAud),
        currency: 'USD',
        updatedAt: data.date ?? null,
        error: invert(usdAud) === null ? 'Missing rate' : null,
      },
      {
        key: 'usd-chf',
        label: 'USD/CHF',
        type: 'forex',
        price: usdChf,
        currency: 'CHF',
        updatedAt: data.date ?? null,
        error: usdChf === null ? 'Missing rate' : null,
      },
    ]
  } catch (error) {
    return [
      {
        key: 'usd-jpy',
        label: 'USD/JPY',
        type: 'forex',
        price: null,
        currency: 'JPY',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
      {
        key: 'eur-usd',
        label: 'EUR/USD',
        type: 'forex',
        price: null,
        currency: 'USD',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
      {
        key: 'gbp-usd',
        label: 'GBP/USD',
        type: 'forex',
        price: null,
        currency: 'USD',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
      {
        key: 'nzd-usd',
        label: 'NZD/USD',
        type: 'forex',
        price: null,
        currency: 'USD',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
      {
        key: 'aud-usd',
        label: 'AUD/USD',
        type: 'forex',
        price: null,
        currency: 'USD',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
      {
        key: 'usd-chf',
        label: 'USD/CHF',
        type: 'forex',
        price: null,
        currency: 'CHF',
        updatedAt: null,
        error: error instanceof Error ? error.message : 'Failed to fetch FX data',
      },
    ]
  }
}