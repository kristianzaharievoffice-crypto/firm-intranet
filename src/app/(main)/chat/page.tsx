export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'

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

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

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
      <main className="space-y-8">
        <PageHeader
          title="Чатове"
          subtitle="Разговори с екипа и непрочетени съобщения по всеки разговор."
        />

        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
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
                    className="block rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-5 transition hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold text-[#1f1a14]">
                          {employeeMap.get(chat.employee_id) ?? 'Служител'}
                        </p>
                        <p className="mt-1 text-sm text-[#7b746b]">
                          Отвори разговора
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#c9a227] px-3 py-2 text-sm font-semibold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })
            ) : (
              <p className="text-[#7b746b]">Няма налични чатове.</p>
            )}
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
      <main className="space-y-8">
        <PageHeader title="Чат" subtitle="Твоят личен разговор с администратора." />
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Няма създаден чат за този служител.</p>
        </div>
      </main>
    )
  }

  redirect(`/chat/${employeeChat.id}`)
}