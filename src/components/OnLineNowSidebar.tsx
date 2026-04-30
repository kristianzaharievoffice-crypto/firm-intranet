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
  status: PresenceStatus
}

type OnlineUserRpcRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  last_seen_at: string | null
  status: PresenceStatus | null
}

type PresenceRow = {
  user_id: string
  last_seen_at: string | null
  status: PresenceStatus | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
}

type PresenceStatus = 'available' | 'busy'

const ONLINE_WINDOW_MS = 60_000

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
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
  const [ownStatus, setOwnStatus] = useState<PresenceStatus>('available')
  const [openingUserId, setOpeningUserId] = useState<string | null>(null)

  const touchOwnPresence = async () => {
    const { error } = await supabase.rpc('touch_user_presence')

    if (error) {
      console.error('online sidebar touch presence error:', error)
    }
  }

  const loadOnlineUsers = async () => {
    await touchOwnPresence()

    const { data: ownPresence } = await supabase
      .from('user_presence')
      .select('status')
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (ownPresence?.status === 'busy' || ownPresence?.status === 'available') {
      setOwnStatus(ownPresence.status)
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_online_users')

    if (!rpcError) {
      const mapped = ((rpcData ?? []) as OnlineUserRpcRow[])
        .filter((user) => user.id !== currentUserId)
        .map((user) => ({
          id: user.id,
          full_name: user.full_name ?? 'User',
          avatar_url: user.avatar_url ?? null,
          job_title: user.job_title ?? null,
          last_seen_at: user.last_seen_at ?? null,
          status: (user.status === 'busy' ? 'busy' : 'available') as PresenceStatus,
        }))
        .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

      setUsers(mapped)
      return
    }

    console.error('get_online_users rpc error:', rpcError)

    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, last_seen_at, status')

    if (error) {
      console.error('online users load error:', error)
      return
    }

    const onlineRows = ((data ?? []) as PresenceRow[])
      .filter((row) => row.user_id !== currentUserId)
      .filter((row) => isOnline(row.last_seen_at))

    if (!onlineRows.length) {
      setUsers([])
      return
    }

    const onlineUserIds = onlineRows.map((row) => row.user_id)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title')
      .in('id', onlineUserIds)

    if (profilesError) {
      console.error('online users profiles load error:', profilesError)
      return
    }

    const presenceMap = new Map(
      onlineRows.map((row) => [row.user_id, row.last_seen_at])
    )

    const profileMap = new Map(
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    )

    const mapped = onlineUserIds
      .map((id) => {
        const profile = profileMap.get(id)

        return {
          id,
          full_name: profile?.full_name ?? 'User',
          avatar_url: profile?.avatar_url ?? null,
          job_title: profile?.job_title ?? null,
          last_seen_at: presenceMap.get(id) ?? null,
          status: (
            onlineRows.find((row) => row.user_id === id)?.status === 'busy'
              ? 'busy'
              : 'available'
          ) as PresenceStatus,
        }
      })
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

    setUsers(mapped)
  }

  const toggleOwnStatus = async () => {
    const nextStatus: PresenceStatus = ownStatus === 'busy' ? 'available' : 'busy'
    setOwnStatus(nextStatus)

    const { error: rpcError } = await supabase.rpc('set_presence_status', {
      next_status: nextStatus,
    })

    if (rpcError) {
      const { error } = await supabase
        .from('user_presence')
        .update({
          status: nextStatus,
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', currentUserId)

      if (error) {
        console.error('set presence status error:', error)
        setOwnStatus(ownStatus)
        return
      }
    }

    await loadOnlineUsers()
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

    const dbChannel = supabase
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
      supabase.removeChannel(dbChannel)
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

        <button
          type="button"
          onClick={() => void toggleOwnStatus()}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            ownStatus === 'busy'
              ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              ownStatus === 'busy' ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />
          {ownStatus === 'busy' ? 'Busy' : 'Online'}
        </button>
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

                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    user.status === 'busy' ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1f1a14]">
                  {user.full_name ?? 'User'}
                </p>
                <p className="truncate text-xs text-[#8f836c]">
                  {openingUserId === user.id
                    ? 'Opening chat...'
                    : user.status === 'busy'
                      ? 'Busy'
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


