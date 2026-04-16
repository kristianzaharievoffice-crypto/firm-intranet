export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NotificationsLiveRefresh from '@/components/NotificationsLiveRefresh'
import ClearNotificationsButton from '@/components/ClearNotificationsButton'
import ClientDateTime from '@/components/ClientDateTime'

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

  // ✅ Mark all as read via RPC
  const { error: markError } = await supabase.rpc(
    'mark_all_my_notifications_read'
  )

  if (markError) {
    console.error('Mark read error:', markError.message)
  }

  // ✅ Load notifications
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="space-y-8">
        <NotificationsLiveRefresh currentUserId={user.id} />

        <PageHeader
          title="Notifications"
          subtitle="All your latest alerts in one place."
        />

        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-red-600">{error.message}</p>
        </div>
      </main>
    )
  }

  const items = (notifications ?? []) as NotificationItem[]

  return (
    <main className="space-y-8">
      {/* ✅ Live refresh */}
      <NotificationsLiveRefresh currentUserId={user.id} />

      <PageHeader
        title="Notifications"
        subtitle="All your latest alerts in one place."
        action={
          items.length ? <ClearNotificationsButton /> : null
        }
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
                    {item.title || 'Untitled'}
                  </h2>

                  {item.body && (
                    <p className="mt-2 leading-7 text-[#443d35]">
                      {item.body}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-[#7b746b]">
                    <ClientDateTime value={item.created_at} />
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                    Read
                  </span>

                  {item.link && (
                    <a
                      href={item.link}
                      className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">No notifications yet.</p>
        </div>
      )}
    </main>
  )
}