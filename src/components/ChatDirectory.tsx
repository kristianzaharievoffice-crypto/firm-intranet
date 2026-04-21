'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserItem {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
  existing_chat_id: string | null
  unread_count: number
  last_message: string
  last_message_at: string | null
  is_online: boolean
  is_pinned: boolean
}

function formatTime(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
  })
}

export default function ChatDirectory({
  currentUserId,
  users,
}: {
  currentUserId: string
  users: UserItem[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [localPins, setLocalPins] = useState<Record<string, boolean>>(
    Object.fromEntries(users.map((u) => [u.id, u.is_pinned]))
  )
  const [localChatIds, setLocalChatIds] = useState<Record<string, string | null>>(
    Object.fromEntries(users.map((u) => [u.id, u.existing_chat_id]))
  )

  const filtered = users.filter((user) => {
    const q = query.trim().toLowerCase()
    if (!q) return true

    return (
      user.full_name.toLowerCase().includes(q) ||
      (user.job_title ?? '').toLowerCase().includes(q) ||
      (user.department ?? '').toLowerCase().includes(q) ||
      (user.last_message ?? '').toLowerCase().includes(q)
    )
  })

  const pinned = filtered.filter((u) => localPins[u.id])
  const regular = filtered.filter((u) => !localPins[u.id])

  const ensureChat = async (userId: string, existingChatId: string | null) => {
    if (existingChatId) return existingChatId

    const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
      other_user_id: userId,
    })

    if (error || !data) return null

    const createdChatId = data as string
    setLocalChatIds((current) => ({ ...current, [userId]: createdChatId }))
    return createdChatId
  }

  const openChat = async (userId: string, existingChatId: string | null) => {
    const chatId = await ensureChat(userId, localChatIds[userId] ?? existingChatId)
    if (!chatId) return
    router.push(`/chat/${chatId}`)
  }

  const togglePin = async (
    e: React.MouseEvent,
    userId: string,
    existingChatId: string | null
  ) => {
    e.stopPropagation()
    e.preventDefault()

    const chatId = await ensureChat(userId, localChatIds[userId] ?? existingChatId)
    if (!chatId) return

    const nextPinned = !localPins[userId]
    setLocalPins((current) => ({ ...current, [userId]: nextPinned }))

    if (nextPinned) {
      await supabase.from('chat_pins').insert({
        user_id: currentUserId,
        chat_id: chatId,
      })
    } else {
      await supabase
        .from('chat_pins')
        .delete()
        .eq('user_id', currentUserId)
        .eq('chat_id', chatId)
    }
  }

  const renderRow = (user: UserItem) => (
    <button
      key={user.id}
      type="button"
      onClick={() => void openChat(user.id, localChatIds[user.id] ?? user.existing_chat_id)}
      disabled={loadingId === user.id}
      className="w-full rounded-[24px] border border-[#ece5d8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-lg font-black text-[#a88414]">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              (user.full_name?.[0] ?? 'U').toUpperCase()
            )}
          </div>

          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white shadow ${
              user.is_online ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-[#1f1a14] sm:text-lg">
                {user.full_name}
              </p>
              <p className="mt-1 truncate text-xs text-[#7b746b] sm:text-sm">
                {user.job_title || 'No job title'}
                {user.department ? ` · ${user.department}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {user.last_message_at && (
                <span className="text-[11px] text-[#9b948a] sm:text-xs">
                  {formatTime(user.last_message_at)}
                </span>
              )}

              {user.unread_count > 0 && (
                <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#c9a227] px-2 text-[11px] font-bold text-white shadow">
                  {user.unread_count}
                </span>
              )}
            </div>
          </div>

          <p className="mt-2 truncate text-sm text-[#5d554c]">
            {user.last_message}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span
              className={`text-xs font-semibold ${
                user.is_online ? 'text-emerald-600' : 'text-[#9b948a]'
              }`}
            >
              {user.is_online ? 'Online' : 'Offline'}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) =>
                  void togglePin(e, user.id, localChatIds[user.id] ?? user.existing_chat_id)
                }
                className={`text-xs font-semibold ${
                  localPins[user.id] ? 'text-[#a88414]' : 'text-[#9b948a]'
                }`}
              >
                {localPins[user.id] ? 'Pinned' : 'Pin'}
              </button>

              <span className="text-sm font-semibold text-[#a88414]">
                {loadingId === user.id ? 'Opening...' : 'Open'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[#ece5d8] bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats, people, departments..."
          className="w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm outline-none focus:border-[#c9a227]"
        />
      </div>

      {pinned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-black tracking-tight text-[#1f1a14]">
            Pinned chats
          </h2>
          <div className="space-y-3">{pinned.map(renderRow)}</div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-black tracking-tight text-[#1f1a14]">
          All chats
        </h2>

        {regular.length ? (
          <div className="space-y-3">{regular.map(renderRow)}</div>
        ) : (
          <div className="rounded-[28px] border border-[#ece5d8] bg-white p-6 shadow-sm">
            <p className="text-[#7b746b]">No chats found.</p>
          </div>
        )}
      </div>
    </div>
  )
}