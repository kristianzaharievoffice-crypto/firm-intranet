export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import Link from 'next/link'

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
  chat_id: string
  sender_id: string
  created_at: string
}

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) {
    redirect('/login')
  }

  if (me.role === 'admin') {
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
      .select('chat_id, sender_id, created_at')
      .in('chat_id', safeChatIds)

    const employeeMap = new Map(
      ((employees ?? []) as EmployeeRow[]).map((employee) => [employee.id, employee.full_name ?? 'Служител'])
    )

    const readMap = new Map(
      ((readRows ?? []) as ChatReadRow[]).map((row) => [row.chat_id, row.last_read_at])
    )

    const messageRows = (messages ?? []) as MessageRow[]

    return (
      <main className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold">Чатове</h1>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="space-y-3">
              {chatRows.length ? (
                chatRows.map((chat) => {
                  const chatMessages = messageRows.filter((m) => m.chat_id === chat.id)
                  const lastReadAt = readMap.get(chat.id)
                  const unreadCount = chatMessages.filter((message) => {
                    if (message.sender_id === user.id) return false
                    if (!lastReadAt) return true
                    return (
                      new Date(message.created_at).getTime() >
                      new Date(lastReadAt).getTime()
                    )
                  }).length

                  return (
                    <Link
                      key={chat.id}
                      href={`/chat/${chat.id}`}
                      className="block border rounded-xl p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span>{employeeMap.get(chat.employee_id) ?? 'Служител'}</span>

                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-semibold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })
              ) : (
                <p className="text-gray-500">Няма налични чатове.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { data: employeeChat } = await supabase
    .from('chats')
    .select('id')
    .eq('employee_id', user.id)
    .single()

  if (!employeeChat) {
    return (
      <main className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-5xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p>Няма създаден чат за този служител.</p>
          </div>
        </div>
      </main>
    )
  }

  redirect(`/chat/${employeeChat.id}`)
}
