'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

interface LiveNotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  created_at: string
}

export default function LiveNotifications({
  currentUserId,
}: {
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<LiveNotificationItem[]>([])
  const latestSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.preload = 'auto'
  }, [])

  const playSound = async () => {
    try {
      if (!audioRef.current) return
      audioRef.current.currentTime = 0
      await audioRef.current.play()
    } catch {}
  }

  const pushNotification = async (newItem: LiveNotificationItem) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === newItem.id)
      if (exists) return current
      return [newItem, ...current].slice(0, 4)
    })

    await playSound()

    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== newItem.id))
    }, 7000)
  }

  const checkLatestNotification = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, link, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const latest = (data as LiveNotificationItem | null) ?? null
    if (!latest) return

    if (!initializedRef.current) {
      latestSeenIdRef.current = latest.id
      initializedRef.current = true
      return
    }

    if (latestSeenIdRef.current !== latest.id) {
      latestSeenIdRef.current = latest.id
      await pushNotification(latest)
    }
  }

  useEffect(() => {
    void checkLatestNotification()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkLatestNotification()
      }
    }, 2000)

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
          const newItem = payload.new as LiveNotificationItem
          latestSeenIdRef.current = newItem.id
          await pushNotification(newItem)
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  const dismiss = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex w-[360px] flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto rounded-[24px] border border-[#eadfbe] bg-white p-4 shadow-[0_18px_50px_rgba(31,26,20,0.15)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
                {uiText.popup.newNotification}
              </p>

              <h3 className="mt-1 text-base font-black tracking-tight text-[#1f1a14]">
                {item.title}
              </h3>

              {item.body && (
                <p className="mt-2 text-sm leading-6 text-[#5a5147]">
                  {item.body}
                </p>
              )}

              <div className="mt-3 flex items-center gap-3">
                {item.link && (
                  <Link
                    href={item.link}
                    className="rounded-[14px] bg-[#c9a227] px-3 py-2 text-sm font-semibold text-white hover:bg-[#a88414]"
                  >
                    {uiText.popup.open}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="text-sm font-medium text-[#7b746b] hover:text-[#1f1a14]"
                >
                  {uiText.popup.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}