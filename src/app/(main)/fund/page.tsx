export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import PammLive from '@/components/PammLive'

export default async function FundPage() {
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
        title="Fund"
        subtitle="Shared Fund items visible to everyone, with live updates."
      />

      <PammLive
        currentUserId={user.id}
        currentUserRole={me.role}
        section="fund"
        sectionLabel="Fund"
        basePath="/fund"
      />
    </main>
  )
}
