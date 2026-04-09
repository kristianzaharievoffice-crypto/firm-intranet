export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ChatListLive from '@/components/ChatListLive'

interface ChatRow {
  id: string
  employee_id: string
}

interface EmployeeRow {
  id: string
  full_name: string | null
}

interface ChatReadRow {
  chat_id: string
  last_read_at: string
}

interface MessageRow {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  if (me.role !== 'admin') {
    const { data: employeeChat } = await supabase
      .from('chats')
      .select('id')
      .eq('employee_id', user.id)
      .single()

    if (!employeeChat) {
      return (
        <main className="space-y-8">
          <PageHeader
            title="Чат"
            subtitle="Твоят личен разговор с администратора."
          />
          <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
            <p className="text-[#7b746b]">Няма създаден чат за този служител.</p>
          </div>
        </main>
      )
    }

    redirect(`/chat/${employeeChat.id}`)
  }

  const { data: chats } = await supabase
    .from('chats')
    .select('id, employee_id')

  const chatRows = (chats ?? []) as ChatRow[]
  const employeeIds = chatRows.map((chat) => chat.employee_id)
  const safeEmployeeIds = employeeIds.length
    ? employeeIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeEmployeeIds)

  const { data: readRows } = await supabase
    .from('chat_reads')
    .select('chat_id, last_read_at')
    .eq('user_id', user.id)

  const chatIds = chatRows.map((chat) => chat.id)
  const safeChatIds = chatIds.length
    ? chatIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: messages } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, content, created_at')
    .in('chat_id', safeChatIds)
    .order('created_at', { ascending: true })

  const employeeMap = new Map(
    ((employees ?? []) as EmployeeRow[]).map((employee) => [
      employee.id,
      employee.full_name ?? 'Служител',
    ])
  )

  const readMap = new Map(
    ((readRows ?? []) as ChatReadRow[]).map((row) => [row.chat_id, row.last_read_at])
  )

  const messageRows = (messages ?? []) as MessageRow[]

  const initialChats = chatRows.map((chat) => {
    const chatMessages = messageRows.filter((m) => m.chat_id === chat.id)
    const lastMessage = chatMessages[chatMessages.length - 1]
    const lastReadAt = readMap.get(chat.id)

    const unreadCount = chatMessages.filter((message) => {
      if (message.sender_id === user.id) return false
      if (!lastReadAt) return true
      return (
        new Date(message.created_at).getTime() >
        new Date(lastReadAt).getTime()
      )
    }).length

    return {
      id: chat.id,
      employee_name: employeeMap.get(chat.employee_id) ?? 'Служител',
      unread_count: unreadCount,
      last_message_text: lastMessage?.content || '',
      last_message_time: lastMessage?.created_at || null,
    }
  })

  return (
    <main className="space-y-8">
      <PageHeader
        title="Чатове"
        subtitle="По-жив списък с разговори, последни съобщения и live badge-ове."
      />

      <ChatListLive
        initialChats={initialChats}
        currentUserId={user.id}
        chatIds={chatIds}
      />
    </main>
  )
}