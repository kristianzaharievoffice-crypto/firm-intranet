export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'admin') redirect('/wall')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      <div className="bg-white p-6 rounded-2xl">
        {users?.map((u) => (
          <div key={u.id} className="border-b py-3">
            <p>{u.full_name}</p>
            <p className="text-sm text-gray-500">{u.role}</p>
          </div>
        ))}
      </div>
    </main>
  )
}