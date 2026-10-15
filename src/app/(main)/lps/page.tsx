export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import LpsWorkspace from '@/components/LpsWorkspace'

export default async function LpsPage({ searchParams }: { searchParams: Promise<{ lp?: string | string[] }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const params = await searchParams
  return <main className="space-y-8"><PageHeader title="LP's" subtitle="Liquidity providers, negotiated terms and instrument comparison." /><LpsWorkspace requestedId={typeof params.lp === 'string' ? params.lp : null} /></main>
}

