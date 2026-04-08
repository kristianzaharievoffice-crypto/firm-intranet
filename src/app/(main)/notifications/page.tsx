export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ✅ маркираме като прочетени
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-extrabold">Известия</h1>

      {notifications?.length ? (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-3xl shadow-sm border p-5"
            >
              <h2 className="font-bold">{n.title}</h2>
              <p className="text-gray-600">{n.body}</p>

              {n.link && (
                <a
                  href={n.link}
                  className="text-yellow-600 text-sm mt-2 inline-block"
                >
                  Отвори →
                </a>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {new Date(n.created_at).toLocaleString('bg-BG')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Няма известия</p>
      )}
    </main>
  )
}