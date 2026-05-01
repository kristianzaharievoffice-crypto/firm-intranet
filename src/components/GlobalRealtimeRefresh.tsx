'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LIVE_TABLES = [
  'profiles',
  'tasks',
  'task_attachments',
  'notifications',
  'events',
  'event_responses',
  'personal_calendar_items',
  'document_companies',
  'company_documents',
  'wall_posts',
  'wall_comments',
  'post_comments',
  'feed_posts',
  'feed_comments',
  'feed_likes',
  'projects',
  'project_posts',
  'pamm_items',
  'sma_deals',
  'site_announcements',
  'chats',
  'chat_members',
  'messages',
  'message_reactions',
  'message_pins',
] as const

const CHAT_TABLES = new Set<string>([
  'chats',
  'chat_members',
  'messages',
  'message_reactions',
  'message_pins',
])

export default function GlobalRealtimeRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const scheduleRefresh = (table: string) => {
      if (document.visibilityState !== 'visible') return

      const currentPath = pathnameRef.current
      const chatPageAlreadyHandlesIt =
        currentPath?.startsWith('/chat/') && CHAT_TABLES.has(table)

      if (chatPageAlreadyHandlesIt) return

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh()
      }, 500)
    }

    const channel = supabase.channel('global-realtime-refresh')

    LIVE_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => scheduleRefresh(table)
      )
    })

    channel.subscribe()

    const refreshWhenReturning = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh('visibility')
      }
    }

    document.addEventListener('visibilitychange', refreshWhenReturning)
    window.addEventListener('focus', refreshWhenReturning)

    const fallbackPoll = setInterval(() => {
      if (!pathnameRef.current?.startsWith('/chat/')) {
        scheduleRefresh('poll')
      }
    }, 30000)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      clearInterval(fallbackPoll)
      document.removeEventListener('visibilitychange', refreshWhenReturning)
      window.removeEventListener('focus', refreshWhenReturning)
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  return null
}


