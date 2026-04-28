'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type OnlineUser = {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  last_seen_at: string | null
}

type PresenceRow = {
  user_id: string
  last_seen_at: string | null
  profiles:
    | {
        id: string
        full_name: string | null
        avatar_url: string | null
        job_title: string | null
      }
    | {
        id: string
        full_name: string | null
        avatar_url: string | null
        job_title: string | null
      }[]
    | null
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < 35_000
}

export default function OnlineNowSidebar({
  currentUserId,
  instanceId = 'default',
}: {
  currentUserId: string
  instanceId?: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [users, setUsers] = useState<OnlineUser[]>([])
  const [openingUserId, setOpeningUserId] = useState<string | null>(null)

  const loadOnlineUsers = async () => {
    const { data, error } = await supabase
      .from('user_presence')
      .select(
        `
        user_id,
        last_seen_at,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          job_title
        )
      `
      )

    if (error) {
      console.error('online users load error:', error)
      return
    }

    const mapped =
      ((data ?? []) as PresenceRow[])
        .map((row) => {
          const profile = Array.isArray(row.profiles)
            ? row.profiles[0] ?? null
            : row.profiles

          return {
            id: profile?.id ?? row.user_id,
            full_name: profile?.full_name ?? 'User',
            avatar_url: profile?.avatar_url ?? null,
            job_title: profile?.job_title ?? null,
            last_seen_at: row.last_seen_at ?? null,
          }
        })
        .filter((user) => user.id !== currentUserId)
        .filter((user) => isOnline(user.last_seen_at))

    setUsers(mapped)
  }

  const openChat = async (otherUserId: string) => {
    setOpeningUserId(otherUserId)

    const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
      other_user_id: otherUserId,
    })

    setOpeningUserId(null)

    if (error || !data) {
      console.error('open online user chat error:', error)
      return
    }

    router.push(`/chat/${data as string}`)
  }

  useEffect(() => {
    void loadOnlineUsers()

    const channel = supabase
      .channel(`online-now-sidebar-${instanceId}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        () => {
          void loadOnlineUsers()
        }
      )
      .subscribe()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadOnlineUsers()
      }
    }, 5000)

    return () => {
      window.clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [currentUserId, instanceId, supabase])

  return (
    <div className="mt-5 rounded-[22px] border border-[#eadfbe] bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-[#1f1a14]">Online now</p>
          <p className="text-xs text-[#8f836c]">
            {users.length ? `${users.length} active` : 'No one online'}
          </p>
        </div>

        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
      </div>

      {users.length ? (
        <div className="space-y-2">
          {users.slice(0, 6).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => openChat(user.id)}
              disabled={openingUserId === user.id}
              className="flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left transition hover:bg-[#f7f1e2] disabled:opacity-60"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.full_name ?? 'User'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (user.full_name?.[0] ?? 'U').toUpperCase()
                )}

                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1f1a14]">
                  {user.full_name ?? 'User'}
                </p>
                <p className="truncate text-xs text-[#8f836c]">
                  {openingUserId === user.id
                    ? 'Opening chat...'
                    : user.job_title || 'Available'}
                </p>
              </div>
            </button>
          ))}

          {users.length > 6 ? (
            <div className="pt-1 text-xs font-semibold text-[#a88414]">
              +{users.length - 6} more online
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[16px] bg-[#faf8f4] px-3 py-3 text-xs text-[#8f836c]">
          Active users will appear here.
        </div>
      )}
    </div>
  )
}


