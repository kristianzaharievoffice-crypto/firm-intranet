export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatRoomLive from '@/components/ChatRoomLive'

type Message = {
  id: string
  content: string | null
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
  reply_to_message_id?: string | null
  edited_at?: string | null
  deleted_at?: string | null
}

type ChatRow = {
  id: string
  chat_type: 'direct' | 'group'
  name: string | null
  created_by: string | null
  user1_id: string | null
  user2_id: string | null
  admin_id: string | null
  employee_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
}

export default async function ChatRoomPage({
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
    .select(
      'id, chat_type, name, created_by, user1_id, user2_id, admin_id, employee_id'
    )
    .eq('id', chatId)
    .maybeSingle<ChatRow>()

  if (!chat) redirect('/chat')

  let canAccess = false
  let memberIds: string[] = []
  const groupName = chat.name?.trim() || 'Untitled group'
  let otherUserId: string | null = null

  if (chat.chat_type === 'group') {
    const { data: membershipRows } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)

    memberIds = (membershipRows ?? []).map((row) => row.user_id as string)
    canAccess = memberIds.includes(user.id)
  } else {
    const first = chat.user1_id ?? chat.admin_id
    const second = chat.user2_id ?? chat.employee_id

    canAccess = first === user.id || second === user.id
    otherUserId = first === user.id ? second : first
    memberIds = [first, second].filter(Boolean) as string[]
  }

  if (!canAccess) redirect('/chat')

  const { data: messages } = await supabase
    .from('messages')
    .select(
      'id, content, created_at, sender_id, chat_id, attachment_url, reply_to_message_id, edited_at, deleted_at'
    )
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, job_title')
    .in('id', memberIds)

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, job_title')
    .order('full_name', { ascending: true })

  const profileRows = (profiles ?? []) as ProfileRow[]

  const senderNames = Object.fromEntries(
    profileRows.map((profile) => [profile.id, profile.full_name ?? 'User'])
  )

  const senderAvatars = Object.fromEntries(
    profileRows.map((profile) => [profile.id, profile.avatar_url ?? null])
  )

  let headerTitle = 'Chat'
  let headerSubtitle = ''
  let otherUserName = ''
  let otherUserAvatar: string | null = null
  let otherUserJobTitle: string | null = null

  if (chat.chat_type === 'group') {
    headerTitle = groupName
    headerSubtitle = `${memberIds.length} members`
  } else {
    const otherProfile = profileRows.find((profile) => profile.id === otherUserId)

    headerTitle = otherProfile?.full_name ?? 'User'
    headerSubtitle = otherProfile?.job_title ?? 'Team member'
    otherUserName = otherProfile?.full_name ?? 'User'
    otherUserAvatar = otherProfile?.avatar_url ?? null
    otherUserJobTitle = otherProfile?.job_title ?? null
  }

  const groupMembers = profileRows.map((profile) => ({
    id: profile.id,
    full_name: profile.full_name ?? 'User',
    avatar_url: profile.avatar_url ?? null,
    job_title: profile.job_title ?? null,
  }))

  const availableMembers = ((allProfiles ?? []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name ?? 'User',
    avatar_url: profile.avatar_url ?? null,
    job_title: profile.job_title ?? null,
  }))

  return (
    <ChatRoomLive
      initialMessages={(messages ?? []) as Message[]}
      currentUserId={user.id}
      currentUserName={senderNames[user.id] ?? 'You'}
      chatId={chatId}
      chatType={chat.chat_type}
      senderNames={senderNames}
      senderAvatars={senderAvatars}
      otherUserId={otherUserId}
      otherUserName={otherUserName}
      otherUserAvatar={otherUserAvatar}
      otherUserJobTitle={otherUserJobTitle}
      groupName={chat.chat_type === 'group' ? groupName : null}
      groupMembers={groupMembers}
      availableMembers={availableMembers}
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
    />
  )
}
