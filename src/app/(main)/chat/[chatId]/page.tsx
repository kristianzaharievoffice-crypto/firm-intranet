export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import RealtimeChat from '@/components/RealtimeChat'
import SendMessageForm from '@/components/SendMessageForm'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
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

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  const { data: chat } = await supabase
    .from('chats')
    .select('id, admin_id, employee_id')
    .eq('id', chatId)
    .single()

  if (!chat) redirect('/chat')

  if (me.role !== 'admin' && chat.employee_id !== user.id) {
    redirect('/wall')
  }

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)

  await supabase.rpc('mark_chat_read', {
    target_chat_id: chatId,
  })

  const { data: messages } = await supabase
    .from('messages')
    .select('id, content, created_at, sender_id, chat_id, attachment_url')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))]
  const safeSenderIds = senderIds.length
    ? senderIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeSenderIds)

  const senderNames = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name ?? 'Потребител'])
  )

  return (
    <main className="space-y-8">
      <PageHeader
        title="Чат"
        subtitle="Модерен разговор с файлове, ясни податели и красив изглед."
      />

      <RealtimeChat
        initialMessages={(messages ?? []) as Message[]}
        currentUserId={user.id}
        chatId={chatId}
        senderNames={senderNames}
      />

      <SendMessageForm chatId={chatId} />
    </main>
  )
}