import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DarkModeToggle from '@/components/DarkModeToggle'

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

  // 🔔 Нотификации
  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // 💬 Чатове
  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .or(`user1.eq.${user.id},user2.eq.${user.id}`)

  const chatIds = (chats ?? []).map((c) => c.id)

  let messagesCount = 0

  if (chatIds.length) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('chat_id', chatIds)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    messagesCount = count ?? 0
  }

  // 📋 Задачи
  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .neq('status', 'done')

  function Badge({ count }: { count: number | null }) {
    if (!count || count === 0) return null

    return (
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        {count}
      </span>
    )
  }

  return (
    <aside className="w-72 bg-white border-r min-h-screen flex flex-col justify-between p-6">
      <div>
        <h1 className="text-2xl font-bold mb-8">
          RCX <span className="text-yellow-500">NETWORK</span>
        </h1>

        <nav className="space-y-2">

          <Link href="/wall" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Стена
          </Link>

          <Link href="/chat" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Чат
            <Badge count={messagesCount} />
          </Link>

          <Link href="/tasks" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Задачи
            <Badge count={tasksCount} />
          </Link>

          <Link href="/calendar" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Календар
          </Link>

          <Link href="/events" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Събития
          </Link>

          <Link href="/employees" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Служители
          </Link>

          <Link href="/notifications" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
            Известия
            <Badge count={notificationsCount} />
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/admin" className="flex items-center px-4 py-3 rounded-2xl hover:bg-yellow-50">
              Admin Panel
            </Link>
          )}
        </nav>
      </div>

      <div>
        <p>{profile?.full_name}</p>
        <p className="text-sm text-gray-500">{profile?.role}</p>

        {/* 🌙 Dark mode бутон */}
        <DarkModeToggle />
      </div>
    </aside>
  )
}