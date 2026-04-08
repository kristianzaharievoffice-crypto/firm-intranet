import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Sidebar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user?.id)
    .single()

  return (
    <aside className="w-64 bg-white border-r p-6 flex flex-col justify-between">
      <div>
        <h1 className="text-xl font-bold mb-8">
          RCX <span className="text-yellow-500">NETWORK</span>
        </h1>

        <nav className="space-y-2">
          <Link href="/wall" className="block p-3 rounded-xl hover:bg-gray-100">
            Стена
          </Link>

          <Link href="/chat" className="block p-3 rounded-xl hover:bg-gray-100">
            Чат
          </Link>

          <Link href="/events" className="block p-3 rounded-xl hover:bg-gray-100">
            Събития
          </Link>

          <Link href="/notifications" className="block p-3 rounded-xl hover:bg-gray-100">
            Известия
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/dashboard" className="block p-3 rounded-xl hover:bg-gray-100">
              Dashboard
            </Link>
          )}
        </nav>
      </div>

      <div className="text-sm text-gray-500">
        <p>{profile?.full_name}</p>
        <p>{profile?.role}</p>
      </div>
    </aside>
  )
}