import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Sidebar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <aside className="w-72 bg-white border-r border-gray-200 min-h-screen p-6 flex flex-col justify-between">
      
      {/* LOGO */}
      <div>
        <h1 className="text-2xl font-bold mb-10 tracking-tight">
          RCX <span className="text-yellow-500">NETWORK</span>
        </h1>

        {/* MENU */}
        <nav className="space-y-2 text-sm">

          <NavItem href="/wall" label="Стена" />
          <NavItem href="/chat" label="Чат" />
          <NavItem href="/tasks" label="Задачи" />
          <NavItem href="/calendar" label="Календар" />
          <NavItem href="/events" label="Събития" />
          <NavItem href="/employees" label="Служители" />
          <NavItem href="/notifications" label="Известия" />

          {profile?.role === 'admin' && (
            <NavItem href="/dashboard" label="Dashboard" />
          )}
        </nav>
      </div>

      {/* USER */}
      <div className="border-t pt-4">
        <p className="font-medium">{profile?.full_name}</p>
        <p className="text-xs text-gray-500">{profile?.role}</p>
      </div>
    </aside>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-3 rounded-xl hover:bg-gray-100 transition"
    >
      {label}
    </Link>
  )
}