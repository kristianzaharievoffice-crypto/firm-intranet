export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const firstUser = chat.user1_id ?? chat.admin_id
  const secondUser = chat.user2_id ?? chat.employee_id

  if (!firstUser || !secondUser) redirect('/chat')

  if (user.id !== firstUser && user.id !== secondUser) {
    redirect('/chat')
  }

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
    .select('id, full_name, avatar_url, job_title')
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

  const otherUserId = user.id === firstUser ? secondUser : firstUser
  const otherProfile = (profiles ?? []).find((p) => p.id === otherUserId)

  return (
    <main className="h-[calc(100dvh-110px)] overflow-hidden">
      <ChatRoomLive
        initialMessages={(messages ?? []) as Message[]}
        currentUserId={user.id}
        chatId={chatId}
        senderNames={senderNames}
        senderAvatars={senderAvatars}
        otherUserId={otherUserId}
        otherUserName={otherProfile?.full_name ?? 'User'}
        otherUserAvatar={otherProfile?.avatar_url ?? null}
        otherUserJobTitle={otherProfile?.job_title ?? null}
      />
    </main>
  )
}
