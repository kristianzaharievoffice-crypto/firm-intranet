export type MarketInstrumentType = 'forex' | 'commodity'

export interface MarketInstrument {
  key: string
  label: string
  type: MarketInstrumentType
  loader: 'fx' | 'gold' | 'wti'
  fromCurrency?: string
  toCurrency?: string
}

export interface MarketQuote {
  key: string
  label: string
  type: MarketInstrumentType
  price: number | null
  currency?: string | null
  updatedAt?: string | null
  error?: string | null
}

export const DEFAULT_MARKET_WATCHLIST: MarketInstrument[] = [
  {
    key: 'gold',
    label: 'Gold',
    type: 'commodity',
    loader: 'gold',
  },
  {
    key: 'wti',
    label: 'WTI Oil',
    type: 'commodity',
    loader: 'wti',
  },
  {
    key: 'usd-jpy',
    label: 'USD/JPY',
    type: 'forex',
    loader: 'fx',
    fromCurrency: 'USD',
    toCurrency: 'JPY',
  },
  {
    key: 'eur-usd',
    label: 'EUR/USD',
    type: 'forex',
    loader: 'fx',
    fromCurrency: 'EUR',
    toCurrency: 'USD',
  },
  {
    key: 'gbp-usd',
    label: 'GBP/USD',
    type: 'forex',
    loader: 'fx',
    fromCurrency: 'GBP',
    toCurrency: 'USD',
  },
  {
    key: 'nzd-usd',
    label: 'NZD/USD',
    type: 'forex',
    loader: 'fx',
    fromCurrency: 'NZD',
    toCurrency: 'USD',
  },
]

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

type FxResponse = {
  'Realtime Currency Exchange Rate'?: {
    '1. From_Currency Code'?: string
    '2. From_Currency Name'?: string
    '3. To_Currency Code'?: string
    '4. To_Currency Name'?: string
    '5. Exchange Rate'?: string
    '6. Last Refreshed'?: string
    '7. Time Zone'?: string
    '8. Bid Price'?: string
    '9. Ask Price'?: string
  }
  Note?: string
  Information?: string
  'Error Message'?: string
}

type GoldSpotResponse = {
  symbol?: string
  name?: string
  interval?: string
  unit?: string
  data?: Array<{
    date?: string
    value?: string
  }>
  Note?: string
  Information?: string
  'Error Message'?: string
}

type WtiResponse = {
  name?: string
  interval?: string
  unit?: string
  data?: Array<{
    date?: string
    value?: string
  }>
  Note?: string
  Information?: string
  'Error Message'?: string
}

async function fetchJson<T>(url: string): Promise<T> {
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

  return (await response.json()) as T
}

async function loadFx(
  instrument: MarketInstrument,
  apiKey: string
): Promise<MarketQuote> {
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE')
  url.searchParams.set('from_currency', instrument.fromCurrency ?? '')
  url.searchParams.set('to_currency', instrument.toCurrency ?? '')
  url.searchParams.set('apikey', apiKey)

  const data = await fetchJson<FxResponse>(url.toString())

  if (data['Error Message'] || data.Information || data.Note) {
    return {
      key: instrument.key,
      label: instrument.label,
      type: instrument.type,
      price: null,
      currency: instrument.toCurrency ?? null,
      updatedAt: null,
      error:
        data['Error Message'] ??
        data.Information ??
        data.Note ??
        'FX data unavailable',
    }
  }

  const fx = data['Realtime Currency Exchange Rate']

  return {
    key: instrument.key,
    label: instrument.label,
    type: instrument.type,
    price: toNumber(fx?.['5. Exchange Rate']),
    currency: fx?.['3. To_Currency Code'] ?? instrument.toCurrency ?? null,
    updatedAt: fx?.['6. Last Refreshed'] ?? null,
    error: null,
  }
}

async function loadGold(
  instrument: MarketInstrument,
  apiKey: string
): Promise<MarketQuote> {
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'GOLD_SILVER_SPOT')
  url.searchParams.set('symbol', 'GOLD')
  url.searchParams.set('apikey', apiKey)

  const data = await fetchJson<GoldSpotResponse>(url.toString())

  if (data['Error Message'] || data.Information || data.Note) {
    return {
      key: instrument.key,
      label: instrument.label,
      type: instrument.type,
      price: null,
      currency: 'USD',
      updatedAt: null,
      error:
        data['Error Message'] ??
        data.Information ??
        data.Note ??
        'Gold data unavailable',
    }
  }

  const latest = Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null

  return {
    key: instrument.key,
    label: instrument.label,
    type: instrument.type,
    price: toNumber(latest?.value),
    currency: 'USD',
    updatedAt: latest?.date ?? null,
    error: null,
  }
}

async function loadWti(
  instrument: MarketInstrument,
  apiKey: string
): Promise<MarketQuote> {
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'WTI')
  url.searchParams.set('interval', 'daily')
  url.searchParams.set('apikey', apiKey)

  const data = await fetchJson<WtiResponse>(url.toString())

  if (data['Error Message'] || data.Information || data.Note) {
    return {
      key: instrument.key,
      label: instrument.label,
      type: instrument.type,
      price: null,
      currency: 'USD',
      updatedAt: null,
      error:
        data['Error Message'] ??
        data.Information ??
        data.Note ??
        'WTI data unavailable',
    }
  }

  const latest = Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null

  return {
    key: instrument.key,
    label: instrument.label,
    type: instrument.type,
    price: toNumber(latest?.value),
    currency: 'USD',
    updatedAt: latest?.date ?? null,
    error: null,
  }
}

export async function fetchMarketQuotes(
  instruments: MarketInstrument[] = DEFAULT_MARKET_WATCHLIST
): Promise<MarketQuote[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY

  if (!apiKey) {
    return instruments.map((instrument) => ({
      key: instrument.key,
      label: instrument.label,
      type: instrument.type,
      price: null,
      currency: null,
      updatedAt: null,
      error: 'Missing ALPHA_VANTAGE_API_KEY',
    }))
  }

  const results = await Promise.all(
    instruments.map(async (instrument) => {
      try {
        if (instrument.loader === 'fx') {
          return await loadFx(instrument, apiKey)
        }

        if (instrument.loader === 'gold') {
          return await loadGold(instrument, apiKey)
        }

        if (instrument.loader === 'wti') {
          return await loadWti(instrument, apiKey)
        }

        return {
          key: instrument.key,
          label: instrument.label,
          type: instrument.type,
          price: null,
          currency: null,
          updatedAt: null,
          error: 'Unsupported instrument loader',
        } satisfies MarketQuote
      } catch (error) {
        return {
          key: instrument.key,
          label: instrument.label,
          type: instrument.type,
          price: null,
          currency: null,
          updatedAt: null,
          error: error instanceof Error ? error.message : 'Unknown fetch error',
        } satisfies MarketQuote
      }
    })
  )

  return results
}