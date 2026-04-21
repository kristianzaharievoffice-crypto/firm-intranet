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
      const first = chat.user1_id ?? chat.admin_id
      const second = chat.user2_id ?? chat.employee_id
      return first === currentUserId || second === currentUserId
    })

    const chatIds = myChats.map((chat) => chat.id)

    let messages: MessageRow[] = []
    let reads: ChatReadRow[] = []

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

      messages = (messagesData ?? []) as MessageRow[]
      reads = (readsData ?? []) as ChatReadRow[]
    }

    const readMap = new Map(reads.map((row) => [row.chat_id, row.last_read_at]))
    const existingChatMap = new Map<string, string>()
    const unreadMap = new Map<string, number>()
    const lastMessageMap = new Map<
      string,
      { text: string; created_at: string | null }
    >()

    for (const chat of myChats) {
      const first = chat.user1_id ?? chat.admin_id
      const second = chat.user2_id ?? chat.employee_id

      if (!first || !second) continue

      const otherUserId = first === currentUserId ? second : first
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

    const mapped: UserItem[] = people.map((person) => ({
      id: person.id,
      full_name: person.full_name ?? 'User',
      avatar_url: person.avatar_url ?? null,
      job_title: person.job_title ?? null,
      department: person.department ?? null,
      existing_chat_id: existingChatMap.get(person.id) ?? null,
      unread_count: unreadMap.get(person.id) ?? 0,
      last_message: lastMessageMap.get(person.id)?.text ?? 'No messages yet',
      last_message_at: lastMessageMap.get(person.id)?.created_at ?? null,
    }))

    mapped.sort((a, b) => {
      if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count

      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0

      if (bTime !== aTime) return bTime - aTime
      return a.full_name.localeCompare(b.full_name)
    })

    setUsers(mapped)
  }

  useEffect(() => {
    void loadDirectory()

    const channel = supabase
      .channel(`chat-list-live-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => void loadDirectory()
      )
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => void loadDirectory()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  const openChat = async (userId: string, existingChatId: string | null) => {
    setLoadingId(userId)

    let chatId = existingChatId

    if (!chatId) {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
        other_user_id: userId,
      })

      if (error || !data) {
        console.error('get_or_create_direct_chat error:', error)
        setLoadingId(null)
        return
      }

      chatId = data as string
    }

    setLoadingId(null)
    router.push(`/chat/${chatId}`)
  }

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

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => void openChat(user.id, user.existing_chat_id)}
              disabled={loadingId === user.id}
              className="w-full rounded-[24px] border border-[#ece5d8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-lg font-black text-[#a88414]">
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

                  <div className="mt-3 text-sm font-semibold text-[#a88414]">
                    {loadingId === user.id ? 'Opening...' : 'Open'}
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[28px] border border-[#ece5d8] bg-white p-6 shadow-sm">
            <p className="text-[#7b746b]">No chats found.</p>
          </div>
        )}
      </div>
    </div>
  )
}