'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AutoRefreshManager() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isChatPage = pathname?.startsWith('/chat')

    if (isChatPage) {
      return
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [pathname, router])

  return null
}