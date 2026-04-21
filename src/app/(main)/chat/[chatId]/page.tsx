export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ChatRoomLive from '@/components/ChatRoomLive'

interface Message {
  id: string
  content: string | null
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
  reply_to_message_id?: string | null
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

  const { data: chat } = await supabase
    .from('chats')
    .select('id, user1_id, user2_id, admin_id, employee_id')
    .eq('id', chatId)
    .single()

  if (!chat) redirect('/chat')

  const chatUser1 = chat.user1_id ?? chat.admin_id
  const chatUser2 = chat.user2_id ?? chat.employee_id

  if (!chatUser1 || !chatUser2) redirect('/chat')

  if (user.id !== chatUser1 && user.id !== chatUser2) {
    redirect('/feed')
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
    .select(
      'id, content, created_at, sender_id, chat_id, attachment_url, reply_to_message_id'
    )
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))]
  const safeSenderIds = senderIds.length
    ? senderIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', safeSenderIds)

  const senderNames = Object.fromEntries(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name ?? 'User',
    ])
  )

  const senderAvatars = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.avatar_url ?? null])
  )

  const otherUserId = user.id === chatUser1 ? chatUser2 : chatUser1
  const otherProfile = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, job_title')
    .eq('id', otherUserId)
    .single()

  const otherUserName = otherProfile.data?.full_name ?? 'User'
  const otherUserAvatar = otherProfile.data?.avatar_url ?? null
  const otherUserJobTitle = otherProfile.data?.job_title ?? null

  return (
    <main className="space-y-5 sm:space-y-8">
      <PageHeader
        title="Chat"
        subtitle="Professional direct conversation."
      />

      <ChatRoomLive
        initialMessages={(messages ?? []) as Message[]}
        currentUserId={user.id}
        chatId={chatId}
        senderNames={senderNames}
        senderAvatars={senderAvatars}
        otherUserId={otherUserId}
        otherUserName={otherUserName}
        otherUserAvatar={otherUserAvatar}
        otherUserJobTitle={otherUserJobTitle}
      />
    </main>
  )
}