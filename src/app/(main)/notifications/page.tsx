export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import { uiText } from '@/lib/ui-text'

interface NotificationItem {
  id: string
  title: string | null
  body: string | null
  link: string | null
  is_read: boolean | null
  created_at: string
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (notifications ?? []) as NotificationItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.notifications.title}
        subtitle={uiText.notifications.subtitle}
      />

      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[28px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
                    {item.title || uiText.common.untitled}
                  </h2>

                  {item.body && (
                    <p className="mt-2 leading-7 text-[#443d35]">{item.body}</p>
                  )}

                  <p className="mt-3 text-sm text-[#7b746b]">
                    {new Date(item.created_at).toLocaleString('bg-BG')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      item.is_read
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-[#fbf3dc] text-[#a88414]'
                    }`}
                  >
                    {item.is_read ? uiText.notifications.read : uiText.notifications.unread}
                  </span>

                  {item.link && (
                    <a
                      href={item.link}
                      className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
                    >
                      {uiText.common.open}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">{uiText.notifications.noNotifications}</p>
        </div>
      )}
    </main>
  )
}