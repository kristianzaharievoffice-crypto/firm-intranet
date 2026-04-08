export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'

interface NotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (notifications ?? []) as NotificationItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title="Известия"
        subtitle="Нови събития, задачи, проверки и важни промени в системата."
      />

      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#7b746b]">
                    {new Date(item.created_at).toLocaleString('bg-BG')}
                  </p>
                </div>

                {!item.is_read && (
                  <span className="rounded-full bg-[#fbf3dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
                    Ново
                  </span>
                )}
              </div>

              {item.body && (
                <p className="whitespace-pre-wrap leading-7 text-[#433b32]">
                  {item.body}
                </p>
              )}

              {item.link && (
                <a
                  href={item.link}
                  className="mt-4 inline-block text-sm font-medium text-[#a88414] hover:underline"
                >
                  Отвори →
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Няма известия.</p>
        </div>
      )}
    </main>
  )
}