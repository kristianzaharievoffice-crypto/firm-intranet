export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
          <h1 className="text-2xl font-bold">Dashboard Debug</h1>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>User Email:</strong> {user.email}</p>
          <p><strong>Profile ID:</strong> {me?.id ?? 'няма profile'}</p>
          <p><strong>Full Name:</strong> {me?.full_name ?? 'няма име'}</p>
          <p><strong>Role:</strong> {me?.role ?? 'няма role'}</p>
          <p><strong>User Error:</strong> {userError?.message ?? 'няма'}</p>
          <p><strong>Profile Error:</strong> {meError?.message ?? 'няма'}</p>
        </div>
      </div>
    </main>
  )
}
