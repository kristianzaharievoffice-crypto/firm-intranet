export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import ChatList from '@/components/ChatList'
import Link from 'next/link'

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
    const { data: chats } = await supabase.from('chats').select('id, employee_id')

    const employeeIds = (chats ?? []).map((chat) => chat.employee_id)

    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', employeeIds.length ? employeeIds : ['00000000-0000-0000-0000-000000000000'])

    const formattedChats =
      chats?.map((chat) => ({
        id: chat.id,
        employee_name:
          employees?.find((e) => e.id === chat.employee_id)?.full_name ?? 'Служител',
      })) ?? []

    return (
      <main className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <h1 className="text-3xl font-bold">Чатове</h1>
          <ChatList chats={formattedChats} />
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