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
        subtitle="Общият фирмен feed за съобщения, файлове, лайкове и коментари в реално време."
      />

      <FeedLive currentUserId={user.id} currentUserRole={me.role} />
    </main>
  )
}