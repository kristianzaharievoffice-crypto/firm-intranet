export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import FeedLive from '@/components/FeedLive'

export default async function FeedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  return (
    <main className="space-y-8">
      <PageHeader
        title="Feed"
        subtitle="The common company feed for messages, files, likes and comments in real time."
      />

      <FeedLive currentUserId={user.id} currentUserRole={me.role} />
    </main>
  )
}