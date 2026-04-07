export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface NotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
  type: string
}

async function markNotificationRead(formData: FormData) {
  'use server'

  const notificationId = formData.get('notificationId') as string
  const supabase = await createClient()

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  revalidatePath('/notifications')
}

async function markAllNotificationsRead() {
  'use server'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  revalidatePath('/notifications')
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, link, is_read, created_at, type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (notifications ?? []) as NotificationItem[]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Известия</h1>
            <p className="text-gray-500 mt-2">
              Нови събития, проверени постове и промени по статуси
            </p>
          </div>

          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="bg-black text-white px-4 py-3 rounded-2xl"
            >
              Маркирай всички като прочетени
            </button>
          </form>
        </div>

        {items.length ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-6 rounded-3xl shadow-lg border ${
                  item.is_read ? 'border-gray-100' : 'border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{item.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleString('bg-BG')}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                      Ново
                    </span>
                  )}
                </div>

                {item.body && (
                  <p className="mt-4 text-gray-700 whitespace-pre-wrap">
                    {item.body}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4">
                  {item.link && (
                    <Link href={item.link} className="text-sm text-black hover:underline">
                      Отвори
                    </Link>
                  )}

                  {!item.is_read && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notificationId" value={item.id} />
                      <button
                        type="submit"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Маркирай като прочетено
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
            <p className="text-gray-500">Все още няма известия.</p>
          </div>
        )}
      </div>
    </main>
  )
}
