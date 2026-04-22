'use client'

import { useEffect, useRef } from 'react'

export default function MarketTickerBar() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FX_IDC:XAUUSD', title: 'Gold' },
        { proName: 'TVC:USOIL', title: 'WTI Oil' },
        { proName: 'FX:USDJPY', title: 'USD/JPY' },
        { proName: 'FX:EURUSD', title: 'EUR/USD' },
        { proName: 'FX:GBPUSD', title: 'GBP/USD' },
        { proName: 'FX:NZDUSD', title: 'NZD/USD' },
      ],
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'light',
      locale: 'en',
    })

    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [])

  return (
    <div className="sticky top-0 z-40 border-b border-yellow-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 xl:px-6">
        <div className="shrink-0 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
          Live Markets
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            ref={containerRef}
            className="tradingview-widget-container"
          />
        </div>
      </div>
    </div>
  )
}