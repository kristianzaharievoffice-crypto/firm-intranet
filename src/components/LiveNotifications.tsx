'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string | null
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

function extractChatId(path: string | null | undefined) {
  if (!path) return null
  const match = path.match(/^\/chat\/([a-z0-9-]+)$/i)
  return match ? match[1] : null
}

export default function LiveNotifications({
  currentUserId,
}: {
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const router = useRouter()

  const [toast, setToast] = useState<NotificationRow | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const currentChatIdRef = useRef<string | null>(null)
  const pathnameRef = useRef<string | null>(null)

  const currentChatId = extractChatId(pathname)

  useEffect(() => {
    currentChatIdRef.current = currentChatId
    pathnameRef.current = pathname
  }, [currentChatId, pathname])

  const dismissToast = () => {
    setToast(null)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const notificationBelongsToOpenChat = (notification: NotificationRow) => {
    const openChatId = currentChatIdRef.current
    const currentPath = pathnameRef.current
    const notificationChatId = extractChatId(notification.link)

    if (!openChatId || !notificationChatId) return false
    if (notificationChatId !== openChatId) return false

    if (currentPath && notification.link && currentPath === notification.link) {
      return true
    }

    return true
  }

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }

  const clearOpenChatNotifications = async () => {
    const openChatId = currentChatIdRef.current
    if (!openChatId) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('type', 'chat')
      .eq('link', `/chat/${openChatId}`)
      .eq('is_read', false)
  }

  useEffect(() => {
    void clearOpenChatNotifications()

    if (toast && notificationBelongsToOpenChat(toast)) {
      dismissToast()
    }
  }, [currentChatId, pathname])

  useEffect(() => {
    const insertChannel = supabase
      .channel(`live-notifications-insert-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const notification = payload.new as NotificationRow
          if (!notification) return

          if (seenIdsRef.current.has(notification.id)) return
          seenIdsRef.current.add(notification.id)

          if (notification.type === 'chat' && notificationBelongsToOpenChat(notification)) {
            await markNotificationRead(notification.id)
            return
          }

          setToast(notification)

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }

          timeoutRef.current = setTimeout(() => {
            setToast(null)
          }, 4500)
        }
      )
      .subscribe()

    const syncChannel = supabase
      .channel(`live-notifications-sync-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          await clearOpenChatNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(insertChannel)
      supabase.removeChannel(syncChannel)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentUserId, supabase])

  if (!toast) return null

  return (
    <button
      type="button"
      onClick={async () => {
        const targetLink = toast.link
        const toastId = toast.id

        dismissToast()
        await markNotificationRead(toastId)

        if (targetLink) {
          router.push(targetLink)
        }
      }}
      className="fixed right-4 top-4 z-[120] w-[340px] max-w-[calc(100vw-2rem)] rounded-[22px] border border-[#eadfbe] bg-white p-4 text-left shadow-2xl transition hover:shadow-xl"
    >
      <p className="text-sm font-black text-[#1f1a14]">
        {toast.title || 'New notification'}
      </p>

      {toast.body ? (
        <p className="mt-1 text-sm leading-6 text-[#6f675d]">
          {toast.body}
        </p>
      ) : null}
    </button>
  )
}
