export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import PammLive from '@/components/PammLive'

export default async function PammPage() {
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
        title="PAMM"
        subtitle="Shared items visible to everyone, with live updates and notifications."
      />

      <PammLive currentUserId={user.id} currentUserRole={me.role} />
    </main>
  )
}