export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import EmployeesList from '@/components/EmployeesList'

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  role: string
  office: string
}

export default async function EmployeesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, job_title, department, role, office'
    )
    .order('full_name', { ascending: true })

  const users = (profiles ?? []) as ProfileRow[]

  const sofia = users.filter((u) => u.office === 'sofia')
  const dubai = users.filter((u) => u.office === 'dubai')

  return (
    <main className="space-y-10">
      <PageHeader
        title="Employees"
        subtitle="Company team divided by offices."
      />

      <div>
        <h2 className="text-2xl font-black text-[#1f1a14] mb-4">
          🇧🇬 Office Sofia
        </h2>
        <EmployeesList users={sofia} isAdmin={me?.role === 'admin'} />
      </div>

      <div>
        <h2 className="text-2xl font-black text-[#1f1a14] mb-4">
          🇦🇪 Office Dubai
        </h2>
        <EmployeesList users={dubai} isAdmin={me?.role === 'admin'} />
      </div>
    </main>
  )
}