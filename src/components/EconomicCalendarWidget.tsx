'use client'

import { useEffect, useRef } from 'react'

export default function EconomicCalendarWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'light',
      isTransparent: true,
      width: '100%',
      height: 640,
      locale: 'en',
      importanceFilter: '-1,0,1',
      currencyFilter: 'EUR,USD,GBP,JPY,AUD,NZD,CHF,CAD',
    })

    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [])

  return (
    <div className="rounded-2xl border border-yellow-200/60 bg-white/95 p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Economic Calendar
        </h2>
        <p className="text-sm text-neutral-500">
          Global macro events and releases
        </p>
      </div>

      <div
        ref={containerRef}
        className="tradingview-widget-container overflow-hidden rounded-2xl border border-yellow-100"
      />
    </div>
  )
}
