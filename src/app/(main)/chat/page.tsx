export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ChatDirectory from '@/components/ChatDirectory'

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

interface DirectoryUser {
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
}

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, job_title, department')
    .neq('id', user.id)
    .order('full_name', { ascending: true })

  const { data: chats } = await supabase
    .from('chats')
    .select('id, user1_id, user2_id, admin_id, employee_id')

  const chatRows = (chats ?? []) as ChatRow[]
  const people = (users ?? []) as ProfileRow[]

  const myChats = chatRows.filter((chat) => {
    const a = chat.user1_id ?? chat.admin_id
    const b = chat.user2_id ?? chat.employee_id
    return a === user.id || b === user.id
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
      .eq('user_id', user.id)
      .in('chat_id', chatIds)

    messages = (messagesData ?? []) as MessageRow[]
    reads = (readsData ?? []) as ChatReadRow[]
  }

  const otherUserIds = myChats
    .map((chat) => {
      const a = chat.user1_id ?? chat.admin_id
      const b = chat.user2_id ?? chat.employee_id
      if (!a || !b) return null
      return a === user.id ? b : a
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

  const presenceMap = new Map(presences.map((row) => [row.user_id, row.last_seen_at]))
  const readMap = new Map(reads.map((row) => [row.chat_id, row.last_read_at]))

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

    const otherUserId = a === user.id ? b : a
    existingChatMap.set(otherUserId, chat.id)

    const chatMessages = messages.filter((message) => message.chat_id === chat.id)
    const latest = chatMessages[0]

    if (latest) {
      const text =
        latest.content?.trim() ||
        (latest.attachment_url ? 'Attached file' : 'New message')

      lastMessageMap.set(otherUserId, {
        text:
          latest.sender_id === user.id ? `You: ${text}` : text,
        created_at: latest.created_at,
      })
    }

    const lastReadAt = readMap.get(chat.id)
    const unreadCount = chatMessages.filter((message) => {
      if (message.sender_id === user.id) return false
      if (!lastReadAt) return true

      return (
        new Date(message.created_at).getTime() >
        new Date(lastReadAt).getTime()
      )
    }).length

    unreadMap.set(otherUserId, unreadCount)
  }

  const directoryUsers: DirectoryUser[] = people
    .map((person) => {
      const lastSeenAt = presenceMap.get(person.id)
      const isOnline = lastSeenAt
        ? Date.now() - new Date(lastSeenAt).getTime() < 35000
        : false

      return {
        id: person.id,
        full_name: person.full_name ?? 'User',
        avatar_url: person.avatar_url ?? null,
        job_title: person.job_title ?? null,
        department: person.department ?? null,
        existing_chat_id: existingChatMap.get(person.id) ?? null,
        unread_count: unreadMap.get(person.id) ?? 0,
        last_message: lastMessageMap.get(person.id)?.text ?? 'No messages yet',
        last_message_at: lastMessageMap.get(person.id)?.created_at ?? null,
        is_online: isOnline,
      }
    })
    .sort((a, b) => {
      if ((b.unread_count ?? 0) !== (a.unread_count ?? 0)) {
        return b.unread_count - a.unread_count
      }

      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0

      if (bTime !== aTime) return bTime - aTime

      return a.full_name.localeCompare(b.full_name)
    })

  return (
    <main className="space-y-8">
      <PageHeader
        title="Chat"
        subtitle="Direct messages with anyone in the company."
      />

      <ChatDirectory users={directoryUsers} />
    </main>
  )
}