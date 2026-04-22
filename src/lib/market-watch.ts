export type MarketInstrumentType = 'forex'

export interface MarketQuote {
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

type FrankfurterDayResponse = {
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

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function fetchUsdRatesForDate(date?: string): Promise<FrankfurterDayResponse | null> {
  const url = new URL('https://api.frankfurter.dev/v2/rates')
  url.searchParams.set('base', 'USD')
  url.searchParams.set('quotes', 'JPY,EUR,GBP,NZD,AUD,CHF')

  if (date) {
    url.searchParams.set('date', date)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) return null

  return (await response.json()) as FrankfurterDayResponse
}

async function fetchPreviousAvailableUsdRates(): Promise<FrankfurterDayResponse | null> {
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)

    const result = await fetchUsdRatesForDate(formatDate(d))
    if (result?.rates && Object.keys(result.rates).length > 0) {
      return result
    }
  }

  return null
}

function buildPair(params: {
  key: string
  label: string
  latest: number | null
  previous: number | null
  currency: string
  updatedAt: string | null
}): MarketQuote {
  const { key, label, latest, previous, currency, updatedAt } = params

  const change =
    latest !== null && previous !== null ? latest - previous : null

  const percentChange =
    latest !== null &&
    previous !== null &&
    previous !== 0
      ? (change! / previous) * 100
      : null

  return {
    key,
    label,
    type: 'forex',
    price: latest,
    previousPrice: previous,
    change,
    percentChange,
    currency,
    updatedAt,
    error: latest === null ? 'Missing rate' : null,
  }
}

export async function fetchMarketQuotes(): Promise<MarketQuote[]> {
  try {
    const [latestData, previousData] = await Promise.all([
      fetchUsdRatesForDate(),
      fetchPreviousAvailableUsdRates(),
    ])

    const latestRates = latestData?.rates ?? {}
    const previousRates = previousData?.rates ?? {}

    const usdJpyLatest = safeNumber(latestRates.JPY)
    const usdJpyPrev = safeNumber(previousRates.JPY)

    const usdEurLatest = safeNumber(latestRates.EUR)
    const usdEurPrev = safeNumber(previousRates.EUR)

    const usdGbpLatest = safeNumber(latestRates.GBP)
    const usdGbpPrev = safeNumber(previousRates.GBP)

    const usdNzdLatest = safeNumber(latestRates.NZD)
    const usdNzdPrev = safeNumber(previousRates.NZD)

    const usdAudLatest = safeNumber(latestRates.AUD)
    const usdAudPrev = safeNumber(previousRates.AUD)

    const usdChfLatest = safeNumber(latestRates.CHF)
    const usdChfPrev = safeNumber(previousRates.CHF)

    return [
      buildPair({
        key: 'usd-jpy',
        label: 'USD/JPY',
        latest: usdJpyLatest,
        previous: usdJpyPrev,
        currency: 'JPY',
        updatedAt: latestData?.date ?? null,
      }),
      buildPair({
        key: 'eur-usd',
        label: 'EUR/USD',
        latest: invert(usdEurLatest),
        previous: invert(usdEurPrev),
        currency: 'USD',
        updatedAt: latestData?.date ?? null,
      }),
      buildPair({
        key: 'gbp-usd',
        label: 'GBP/USD',
        latest: invert(usdGbpLatest),
        previous: invert(usdGbpPrev),
        currency: 'USD',
        updatedAt: latestData?.date ?? null,
      }),
      buildPair({
        key: 'nzd-usd',
        label: 'NZD/USD',
        latest: invert(usdNzdLatest),
        previous: invert(usdNzdPrev),
        currency: 'USD',
        updatedAt: latestData?.date ?? null,
      }),
      buildPair({
        key: 'aud-usd',
        label: 'AUD/USD',
        latest: invert(usdAudLatest),
        previous: invert(usdAudPrev),
        currency: 'USD',
        updatedAt: latestData?.date ?? null,
      }),
      buildPair({
        key: 'usd-chf',
        label: 'USD/CHF',
        latest: usdChfLatest,
        previous: usdChfPrev,
        currency: 'CHF',
        updatedAt: latestData?.date ?? null,
      }),
    ]
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch FX data'

    return [
      {
        key: 'usd-jpy',
        label: 'USD/JPY',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'JPY',
        updatedAt: null,
        error: message,
      },
      {
        key: 'eur-usd',
        label: 'EUR/USD',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'USD',
        updatedAt: null,
        error: message,
      },
      {
        key: 'gbp-usd',
        label: 'GBP/USD',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'USD',
        updatedAt: null,
        error: message,
      },
      {
        key: 'nzd-usd',
        label: 'NZD/USD',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'USD',
        updatedAt: null,
        error: message,
      },
      {
        key: 'aud-usd',
        label: 'AUD/USD',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'USD',
        updatedAt: null,
        error: message,
      },
      {
        key: 'usd-chf',
        label: 'USD/CHF',
        type: 'forex',
        price: null,
        previousPrice: null,
        change: null,
        percentChange: null,
        currency: 'CHF',
        updatedAt: null,
        error: message,
      },
    ]
  }
}