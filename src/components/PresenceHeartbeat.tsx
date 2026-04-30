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
      const payload = {
        last_seen_at: new Date().toISOString(),
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('user_presence')
        .update(payload)
        .eq('user_id', currentUserId)
        .select('user_id')

      if (updateError) {
        console.error('presence heartbeat update error:', updateError)
        return
      }

      if (updatedRows?.length) return

      const { error: insertError } = await supabase.from('user_presence').insert(
        {
          user_id: currentUserId,
          ...payload,
        }
      )

      if (insertError) {
        console.error('presence heartbeat insert error:', insertError)
      }
    }

    const markOffline = () => {
      void supabase
        .from('user_presence')
        .update({ last_seen_at: new Date(0).toISOString() })
        .eq('user_id', currentUserId)
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


