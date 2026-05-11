'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsLiveRefresh({
  currentUserId,
}: {
  currentUserId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null

    const refreshSoon = () => {
      if (document.visibilityState !== 'visible') return

      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }

      refreshTimeout = setTimeout(() => {
        router.refresh()
      }, 250)
    }

    const channel = supabase
      .channel(`notifications-page-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          refreshSoon()
        }
      )
      .subscribe()

    const refreshOnFocus = () => refreshSoon()

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }

      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
      supabase.removeChannel(channel)
    }
  }, [currentUserId, router, supabase])

  return null
}


