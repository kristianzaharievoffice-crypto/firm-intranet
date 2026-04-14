'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Announcement {
  id: string
  content: string
  expires_at: string | null
  created_at: string
}

export default function TopAnnouncementBar() {
  const supabase = useMemo(() => createClient(), [])
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  const loadAnnouncement = async () => {
    const { data } = await supabase
      .from('site_announcements')
      .select('id, content, expires_at, created_at')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setAnnouncement((data as Announcement | null) ?? null)
  }

  useEffect(() => {
    void loadAnnouncement()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadAnnouncement()
      }
    }, 5000)

    const channel = supabase
      .channel('site-announcements-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_announcements',
        },
        () => {
          void loadAnnouncement()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (!announcement) return null

  return (
    <div className="mb-6 rounded-[24px] border border-[#eadfbe] bg-gradient-to-r from-[#fbf6e8] to-[#fff8df] px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
            Pinned announcement
          </p>
          <p className="mt-1 text-[15px] font-medium leading-7 text-[#3d352d]">
            {announcement.content}
          </p>
        </div>

        {announcement.expires_at && (
          <p className="text-xs text-[#7b746b]">
            До: {new Date(announcement.expires_at).toLocaleString('bg-BG')}
          </p>
        )}
      </div>
    </div>
  )
}