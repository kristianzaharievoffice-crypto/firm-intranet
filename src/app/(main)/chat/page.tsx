export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ChatDirectory from '@/components/ChatDirectory'
import { uiText } from '@/lib/ui-text'

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

interface DirectoryUser {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
  existing_chat_id: string | null
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

  const existingChatMap = new Map<string, string>()

  for (const chat of chatRows) {
    const a = chat.user1_id ?? chat.admin_id
    const b = chat.user2_id ?? chat.employee_id

    if (!a || !b) continue

    if (a === user.id) existingChatMap.set(b, chat.id)
    if (b === user.id) existingChatMap.set(a, chat.id)
  }

  const directoryUsers: DirectoryUser[] = people.map((person) => ({
    id: person.id,
    full_name: person.full_name ?? uiText.common.user,
    avatar_url: person.avatar_url ?? null,
    job_title: person.job_title ?? null,
    department: person.department ?? null,
    existing_chat_id: existingChatMap.get(person.id) ?? null,
  }))

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.chat.title}
        subtitle={uiText.chat.subtitle}
      />

      <ChatDirectory users={directoryUsers} />
    </main>
  )
}