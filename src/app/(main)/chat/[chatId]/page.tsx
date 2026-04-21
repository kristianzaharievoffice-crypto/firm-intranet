'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
}

interface ChatRow {
  id: string
  user1_id: string | null
  user2_id: string | null
  admin_id: string | null
  employee_id: string | null
}

interface MessageRow {
  id: string
  chat_id: string
  sender_id: string
  content: string | null
  created_at: string
  attachment_url: string | null
}

interface ChatReadRow {
  chat_id: string
  last_read_at: string | null
}

interface PresenceRow {
  user_id: string
  last_seen_at: string | null
}

interface ChatPinRow {
  chat_id: string
}

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
}: {
  currentUserId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])

  const loadDirectory = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title, department')
      .neq('id', currentUserId)
      .order('full_name', { ascending: true })

    const { data: chatsData } = await supabase
      .from('chats')
      .select('id, user1_id, user2_id, admin_id, employee_id')

    const people = (profilesData ?? []) as ProfileRow[]
    const chats = (chatsData ?? []) as ChatRow[]

    const myChats = chats.filter((chat) => {
      const a = chat.user1_id ?? chat.admin_id
      const b = chat.user2_id ?? chat.employee_id
      return a === currentUserId || b === currentUserId
    })

    const chatIds = myChats.map((chat) => chat.id)

    let messages: MessageRow[] = []
    let reads: ChatReadRow[] = []
    let pins: ChatPinRow[] = []

    if (chatIds.length) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, chat_id, sender_id, content, created_at, attachment_url')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })

      const { data: readsData } = await supabase
        .from('chat_reads')
        .select('chat_id, last_read_at')
        .eq('user_id', currentUserId)
        .in('chat_id', chatIds)

      const { data: pinsData } = await supabase
        .from('chat_pins')
        .select('chat_id')
        .eq('user_id', currentUserId)
        .in('chat_id', chatIds)

      messages = (messagesData ?? []) as MessageRow[]
      reads = (readsData ?? []) as ChatReadRow[]
      pins = (pinsData ?? []) as ChatPinRow[]
    }

    const otherUserIds = myChats
      .map((chat) => {
        const a = chat.user1_id ?? chat.admin_id
        const b = chat.user2_id ?? chat.employee_id
        if (!a || !b) return null
        return a === currentUserId ? b : a
      })
      .filter(Boolean) as string[]

    let presences: PresenceRow[] = []
    if (otherUserIds.length) {
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, last_seen_at')
        .in('user_id', otherUserIds)

      presences = (presenceData ?? []) as PresenceRow[]
    }

    const presenceMap = new Map(
      presences.map((row) => [row.user_id, row.last_seen_at])
    )
    const readMap = new Map(reads.map((row) => [row.chat_id, row.last_read_at]))
    const pinnedSet = new Set(pins.map((row) => row.chat_id))

    const existingChatMap = new Map<string, string>()
    const unreadMap = new Map<string, number>()
    const lastMessageMap = new Map<
      string,
      { text: string; created_at: string | null }
    >()

    for (const chat of myChats) {
      const a = chat.user1_id ?? chat.admin_id
      const b = chat.user2_id ?? chat.employee_id

      if (!a || !b) continue

      const otherUserId = a === currentUserId ? b : a
      existingChatMap.set(otherUserId, chat.id)

      const chatMessages = messages.filter((message) => message.chat_id === chat.id)
      const latest = chatMessages[0]

      if (latest) {
        const text =
          latest.content?.trim() ||
          (latest.attachment_url ? 'Attached file' : 'New message')

        lastMessageMap.set(otherUserId, {
          text: latest.sender_id === currentUserId ? `You: ${text}` : text,
          created_at: latest.created_at,
        })
      }

      const lastReadAt = readMap.get(chat.id)
      const unreadCount = chatMessages.filter((message) => {
        if (message.sender_id === currentUserId) return false
        if (!lastReadAt) return true

        return (
          new Date(message.created_at).getTime() >
          new Date(lastReadAt).getTime()
        )
      }).length

      unreadMap.set(otherUserId, unreadCount)
    }

    const mapped: UserItem[] = people
      .map((person) => {
        const lastSeenAt = presenceMap.get(person.id)
        const isOnline = lastSeenAt
          ? Date.now() - new Date(lastSeenAt).getTime() < 35000
          : false

        const chatId = existingChatMap.get(person.id) ?? null

        return {
          id: person.id,
          full_name: person.full_name ?? 'User',
          avatar_url: person.avatar_url ?? null,
          job_title: person.job_title ?? null,
          department: person.department ?? null,
          existing_chat_id: chatId,
          unread_count: unreadMap.get(person.id) ?? 0,
          last_message: lastMessageMap.get(person.id)?.text ?? 'No messages yet',
          last_message_at: lastMessageMap.get(person.id)?.created_at ?? null,
          is_online: isOnline,
          is_pinned: chatId ? pinnedSet.has(chatId) : false,
        }
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        if ((b.unread_count ?? 0) !== (a.unread_count ?? 0)) {
          return b.unread_count - a.unread_count
        }

        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0

        if (bTime !== aTime) return bTime - aTime
        return a.full_name.localeCompare(b.full_name)
      })

    setUsers(mapped)
  }

  useEffect(() => {
    void loadDirectory()

    const messageChannel = supabase
      .channel(`chat-list-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => void loadDirectory()
      )
      .subscribe()

    const readChannel = supabase
      .channel(`chat-list-reads-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void loadDirectory()
      )
      .subscribe()

    const presenceChannel = supabase
      .channel(`chat-list-presence-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => void loadDirectory()
      )
      .subscribe()

    const pinChannel = supabase
      .channel(`chat-list-pins-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_pins',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void loadDirectory()
      )
      .subscribe()

    const chatChannel = supabase
      .channel(`chat-list-chats-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => void loadDirectory()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(readChannel)
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(pinChannel)
      supabase.removeChannel(chatChannel)
    }
  }, [currentUserId, supabase])

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

  const pinned = filtered.filter((u) => u.is_pinned)
  const regular = filtered.filter((u) => !u.is_pinned)

  const ensureChat = async (userId: string, existingChatId: string | null) => {
    if (existingChatId) return existingChatId

    const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
      other_user_id: userId,
    })

    if (error || !data) return null
    return data as string
  }

  const openChat = async (userId: string, existingChatId: string | null) => {
    setLoadingId(userId)
    const chatId = await ensureChat(userId, existingChatId)
    setLoadingId(null)

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

    const chatId = await ensureChat(userId, existingChatId)
    if (!chatId) return

    const target = users.find((u) => u.id === userId)
    const nextPinned = !(target?.is_pinned ?? false)

    setUsers((current) =>
      current.map((u) =>
        u.id === userId
          ? { ...u, existing_chat_id: chatId, is_pinned: nextPinned }
          : u
      )
    )

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

    await loadDirectory()
  }

  const renderRow = (user: UserItem) => (
    <button
      key={user.id}
      type="button"
      onClick={() => void openChat(user.id, user.existing_chat_id)}
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
                onClick={(e) => void togglePin(e, user.id, user.existing_chat_id)}
                className={`text-xs font-semibold ${
                  user.is_pinned ? 'text-[#a88414]' : 'text-[#9b948a]'
                }`}
              >
                {user.is_pinned ? 'Pinned' : 'Pin'}
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