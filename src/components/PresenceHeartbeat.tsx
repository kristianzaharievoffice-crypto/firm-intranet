'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const HEARTBEAT_INTERVAL_MS = 8000

export default function PresenceHeartbeat({
  currentUserId,
}: {
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const updatePresence = async () => {
      const { error } = await supabase.from('user_presence').upsert(
        {
          user_id: currentUserId,
          last_seen_at: new Date().toISOString(),
          current_chat_id: null,
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.error('presence heartbeat error:', error)
      }
    }

    const markOffline = () => {
      void supabase.from('user_presence').upsert(
        {
          user_id: currentUserId,
          last_seen_at: new Date(0).toISOString(),
          current_chat_id: null,
        },
        { onConflict: 'user_id' }
      )
    }

    void updatePresence()

    const interval = window.setInterval(() => {
      void updatePresence()
    }, HEARTBEAT_INTERVAL_MS)

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void updatePresence()
      }
    }

    const handleFocus = () => {
      void updatePresence()
    }

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pagehide', markOffline)
    window.addEventListener('beforeunload', markOffline)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pagehide', markOffline)
      window.removeEventListener('beforeunload', markOffline)
    }
  }, [currentUserId, supabase])

  return null
}


