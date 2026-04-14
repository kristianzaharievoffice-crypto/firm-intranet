'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.preload = 'auto'
  }, [])

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
        (payload) => {
          const newItem = payload.new as LiveNotificationItem

          setItems((current) => [newItem, ...current].slice(0, 4))

          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {
              // браузърът може да блокира auto-play до първо взаимодействие
            })
          }

          setTimeout(() => {
            setItems((current) => current.filter((item) => item.id !== newItem.id))
          }, 7000)
        }
      )
      .subscribe()

    return () => {
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
                Ново известие
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
                    Отвори
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="text-sm font-medium text-[#7b746b] hover:text-[#1f1a14]"
                >
                  Затвори
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}