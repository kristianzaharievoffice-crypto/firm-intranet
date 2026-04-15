export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import PammList from '@/components/PammList'
import StatCard from '@/components/StatCard'

interface PammRow {
  id: string
  title: string
  description: string | null
  amount: number
  currency: 'USD' | 'EUR'
  status: string
  created_at: string
  created_by: string
}

interface ProfileRow {
  id: string
  full_name: string | null
}

async function updatePammStatus(formData: FormData) {
  'use server'

  const itemId = String(formData.get('itemId') || '')
  const status = String(formData.get('status') || '')
  const supabase = await createClient()

  await supabase.from('pamm_items').update({ status }).eq('id', itemId)

  revalidatePath('/pamm')
}

async function deletePammItem(formData: FormData) {
  'use server'

  const itemId = String(formData.get('itemId') || '')
  const supabase = await createClient()

  await supabase.from('pamm_items').delete().eq('id', itemId)

  revalidatePath('/pamm')
}

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

  const { data: items } = await supabase
    .from('pamm_items')
    .select('id, title, description, amount, currency, status, created_at, created_by')
    .order('created_at', { ascending: false })

  const rows = (items ?? []) as PammRow[]
  const creatorIds = [...new Set(rows.map((item) => item.created_by))]
  const safeIds = creatorIds.length
    ? creatorIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: creators } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeIds)

  const creatorMap = new Map(
    ((creators ?? []) as ProfileRow[]).map((creator) => [
      creator.id,
      creator.full_name ?? 'User',
    ])
  )

  const itemsWithNames = rows.map((item) => ({
    ...item,
    creator_name: creatorMap.get(item.created_by) ?? 'User',
  }))

  const total = itemsWithNames.length
  const totalNew = itemsWithNames.filter((i) => i.status === 'new').length
  const totalInProgress = itemsWithNames.filter((i) => i.status === 'in_progress').length
  const totalDone = itemsWithNames.filter((i) => i.status === 'done').length

  return (
    <main className="space-y-8">
      <PageHeader
        title="PAMM"
        subtitle="Shared items visible to everyone."
        action={
          <Link
            href="/pamm/new"
            className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
          >
            New PAMM item
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total items" value={total} />
        <StatCard label="New" value={totalNew} />
        <StatCard label="In progress" value={totalInProgress} tone="soft" />
        <StatCard label="Done" value={totalDone} tone="gold" />
      </div>

      <PammList
        items={itemsWithNames}
        updateStatusAction={updatePammStatus}
        deleteAction={deletePammItem}
        isAdmin={me.role === 'admin'}
      />
    </main>
  )
}