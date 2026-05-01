'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function hasEditableFocus() {
  const active = document.activeElement
  if (!active) return false

  const tagName = active.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    active.getAttribute('contenteditable') === 'true'
  )
}

export default function PageRealtimeRefresh({
  tables,
  pollMs = 15000,
}: {
  tables: string[]
  pollMs?: number
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const uniqueTables = [...new Set(tables.filter(Boolean))]
    if (!uniqueTables.length) return

    const scheduleRefresh = () => {
      if (document.visibilityState !== 'visible' || hasEditableFocus()) return

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (!hasEditableFocus()) {
          router.refresh()
        }
      }, 400)
    }

    const channel = supabase.channel(`page-refresh-${uniqueTables.join('-')}`)

    uniqueTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        scheduleRefresh
      )
    })

    channel.subscribe()

    const refreshWhenReturning = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }

    const interval =
      pollMs > 0
        ? setInterval(() => {
            scheduleRefresh()
          }, pollMs)
        : null

    document.addEventListener('visibilitychange', refreshWhenReturning)
    window.addEventListener('focus', refreshWhenReturning)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      if (interval) {
        clearInterval(interval)
      }

      document.removeEventListener('visibilitychange', refreshWhenReturning)
      window.removeEventListener('focus', refreshWhenReturning)
      supabase.removeChannel(channel)
    }
  }, [pollMs, router, supabase, tables])

  return null
}
