'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function getCurrentBrowserChatId() {
  if (typeof window === 'undefined') return null
  return extractChatId(window.location.pathname)
}

export default function LiveNotifications({
  currentUserId,
}: {
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [toast, setToast] = useState<NotificationRow | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const dismissToast = () => {
    setToast(null)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }

  const clearOpenChatNotifications = async () => {
    const currentChatId = getCurrentBrowserChatId()
    if (!currentChatId) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('type', 'chat')
      .eq('link', `/chat/${currentChatId}`)
      .eq('is_read', false)
  }

  const notificationBelongsToOpenChat = (notification: NotificationRow) => {
    if (notification.type !== 'chat') return false

    const openChatId = getCurrentBrowserChatId()
    const notificationChatId = extractChatId(notification.link)

    if (!openChatId || !notificationChatId) return false
    return openChatId === notificationChatId
  }

  useEffect(() => {
    void clearOpenChatNotifications()

    const onFocus = () => {
      void clearOpenChatNotifications()
      if (toast && notificationBelongsToOpenChat(toast)) {
        dismissToast()
      }
    }

    const onPopState = () => {
      void clearOpenChatNotifications()
      if (toast && notificationBelongsToOpenChat(toast)) {
        dismissToast()
      }
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener('popstate', onPopState)

    const interval = window.setInterval(() => {
      void clearOpenChatNotifications()

      setToast((currentToast) => {
        if (currentToast && notificationBelongsToOpenChat(currentToast)) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          return null
        }
        return currentToast
      })
    }, 1000)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('popstate', onPopState)
      window.clearInterval(interval)
    }
  }, [currentUserId, toast, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`live-notifications-${currentUserId}`)
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

          if (notificationBelongsToOpenChat(notification)) {
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

    return () => {
      supabase.removeChannel(channel)

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
