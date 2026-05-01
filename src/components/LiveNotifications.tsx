'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notificationTitle } from '@/lib/notifications'

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
  const lastShownToastIdRef = useRef<string | null>(null)
  const lastShownDesktopIdRef = useRef<string | null>(null)
  const syncInFlightRef = useRef(false)

  const currentChatId = extractChatId(pathname)

  const dismissToast = () => {
    setToast(null)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const notificationBelongsToOpenChat = (notification: NotificationRow) => {
    if (notification.type !== 'chat') return false

    const notificationChatId = extractChatId(notification.link)
    if (!notificationChatId || !currentChatId) return false

    return notificationChatId === currentChatId
  }

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }

  const ensureDesktopPermission = async () => {
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  const showDesktopNotification = async (notification: NotificationRow) => {
    if (notificationBelongsToOpenChat(notification)) return
    if (lastShownDesktopIdRef.current === notification.id) return

    const allowed = await ensureDesktopPermission()
    if (!allowed) return

    lastShownDesktopIdRef.current = notification.id

    const desktopNotification = new Notification(
      notificationTitle(notification.title, notification.link),
      {
        body: notification.body || 'New notification',
        tag: notification.id,
      }
    )

    desktopNotification.onclick = () => {
      window.focus()

      if (notification.link) {
        router.push(notification.link)
      }

      void markNotificationRead(notification.id)
      desktopNotification.close()
    }

    setTimeout(() => {
      desktopNotification.close()
    }, 8000)
  }

  const clearOpenChatNotifications = async () => {
    if (!currentChatId) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('type', 'chat')
      .eq('link', `/chat/${currentChatId}`)
      .eq('is_read', false)
  }

  const syncToast = async () => {
    if (syncInFlightRef.current) return
    syncInFlightRef.current = true

    try {
      await clearOpenChatNotifications()

      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, link, is_read, created_at')
        .eq('user_id', currentUserId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('live notifications sync error:', error)
        return
      }

      const unread = (data ?? []) as NotificationRow[]

      const candidate = unread.find(
        (notification) => !notificationBelongsToOpenChat(notification)
      )

      if (!candidate) {
        dismissToast()
        return
      }

      if (lastShownToastIdRef.current === candidate.id) {
        await showDesktopNotification(candidate)
        return
      }

      lastShownToastIdRef.current = candidate.id
      setToast(candidate)
      await showDesktopNotification(candidate)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setToast(null)
      }, 4500)
    } finally {
      syncInFlightRef.current = false
    }
  }

  useEffect(() => {
    void ensureDesktopPermission()
  }, [])

  useEffect(() => {
    void syncToast()

    if (toast && notificationBelongsToOpenChat(toast)) {
      dismissToast()
    }
  }, [pathname, currentChatId])

  useEffect(() => {
    const channel = supabase
      .channel(`live-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          await syncToast()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentUserId, supabase, currentChatId])

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
        {notificationTitle(toast.title, toast.link)}
      </p>

      {toast.body ? (
        <p className="mt-1 text-sm leading-6 text-[#6f675d]">{toast.body}</p>
      ) : null}
    </button>
  )
}
