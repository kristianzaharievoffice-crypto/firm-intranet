export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ChatDirectory from '@/components/ChatDirectory'

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="space-y-8">
      <PageHeader
        title="Chat"
        subtitle="Direct messages with anyone in the company."
      />

      <ChatDirectory currentUserId={user.id} />
    </main>
  )
}