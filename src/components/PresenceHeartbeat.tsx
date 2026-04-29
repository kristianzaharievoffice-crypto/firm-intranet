'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PresenceHeartbeat({
  currentUserId,
}: {
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const updatePresence = async () => {
      await supabase.from('user_presence').upsert(
        {
          user_id: currentUserId,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }

    void updatePresence()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updatePresence()
      }
    }, 10000)

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

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUserId, supabase])

  return null
}


