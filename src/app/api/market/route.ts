import { NextResponse } from 'next/server'
import {
  DEFAULT_MARKET_WATCHLIST,
  fetchMarketQuotes,
} from '@/lib/market-watch'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const quotes = await fetchMarketQuotes(DEFAULT_MARKET_WATCHLIST)

  return NextResponse.json(
    {
      quotes,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}
