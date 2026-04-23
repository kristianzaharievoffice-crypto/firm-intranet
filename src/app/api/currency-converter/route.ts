import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FrankfurterRateResponse = {
  amount?: number
  base?: string
  date?: string
  rate?: number
}

function isValidCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const amountParam = searchParams.get('amount') ?? '1'
    const fromParam = (searchParams.get('from') ?? 'EUR').toUpperCase()
    const toParam = (searchParams.get('to') ?? 'USD').toUpperCase()

    const amount = Number(amountParam)

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Please enter a number greater than 0.' },
        { status: 400 }
      )
    }

    if (!isValidCurrencyCode(fromParam) || !isValidCurrencyCode(toParam)) {
      return NextResponse.json(
        { error: 'Invalid currency code. Use values like EUR, USD, GBP, BGN.' },
        { status: 400 }
      )
    }

    if (fromParam === toParam) {
      return NextResponse.json(
        {
          amount,
          from: fromParam,
          to: toParam,
          rate: 1,
          result: amount,
          date: new Date().toISOString().slice(0, 10),
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    }

    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${fromParam}/${toParam}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          error: `Failed to fetch exchange rate (${response.status}). ${errorText || 'Please try again.'}`,
        },
        { status: 502 }
      )
    }

    const data = (await response.json()) as FrankfurterRateResponse
    const rate = typeof data.rate === 'number' && Number.isFinite(data.rate) ? data.rate : null

    if (rate === null) {
      return NextResponse.json(
        { error: 'Exchange rate is missing in the API response.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        amount,
        from: fromParam,
        to: toParam,
        rate,
        result: amount * rate,
        date: data.date ?? new Date().toISOString().slice(0, 10),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while converting currency.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
