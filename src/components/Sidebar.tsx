import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Sidebar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <aside className="w-72 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between p-6">
      <div>
        <div className="mb-10">
          <h1 className="text-2xl font-extrabold tracking-tight">
            RCX <span className="text-yellow-500">NETWORK</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Вътрешна фирмена система
          </p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/wall"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Стена
          </Link>

          <Link
            href="/chat"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Чат
          </Link>

          <Link
            href="/tasks"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Задачи
          </Link>

          <Link
            href="/events"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Събития
          </Link>

          <Link
            href="/employees"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Служители
          </Link>

          <Link
            href="/notifications"
            className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
          >
            Известия
          </Link>

          {profile?.role === 'admin' && (
            <Link
              href="/dashboard"
              className="block px-4 py-3 rounded-2xl hover:bg-yellow-50 hover:text-yellow-700 transition"
            >
              Dashboard
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t pt-4">
        <p className="font-medium">{profile?.full_name ?? user.email}</p>
        <p className="text-sm text-gray-500">{profile?.role}</p>
      </div>
    </aside>
  )
}