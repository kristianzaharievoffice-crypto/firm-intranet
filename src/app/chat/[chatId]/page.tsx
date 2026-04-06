export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import ChatMessages from '@/components/ChatMessages'
import SendMessageForm from '@/components/SendMessageForm'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
}

export default async function ChatDetailsPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
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

  const { data: chat } = await supabase
    .from('chats')
    .select('id, admin_id, employee_id')
    .eq('id', chatId)
    .single()

  if (!chat) {
    redirect('/chat')
  }

  if (me.role !== 'admin' && chat.employee_id !== user.id) {
    redirect('/wall')
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, content, created_at, sender_id')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Чат</h1>
        <ChatMessages messages={(messages ?? []) as Message[]} currentUserId={user.id} />
        <SendMessageForm chatId={chatId} />
      </div>
    </main>
  )
}