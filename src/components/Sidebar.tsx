import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNavLive from '@/components/SidebarNavLive'

export default async function Sidebar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  let chatIds: string[] = []

  if (profile.role === 'admin') {
    const { data: chats } = await supabase.from('chats').select('id')
    chatIds = (chats ?? []).map((c) => c.id)
  } else {
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .eq('employee_id', user.id)

    chatIds = (chats ?? []).map((c) => c.id)
  }

  let unreadChatCount = 0

  if (chatIds.length) {
    const { data: readRows } = await supabase
      .from('chat_reads')
      .select('chat_id, last_read_at')
      .eq('user_id', user.id)

    const { data: messages } = await supabase
      .from('messages')
      .select('chat_id, created_at, sender_id')
      .in('chat_id', chatIds)

    const readMap = new Map(
      (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
    )

    unreadChatCount = (messages ?? []).filter((message) => {
      if (message.sender_id === user.id) return false

      const lastReadAt = readMap.get(message.chat_id)
      if (!lastReadAt) return true

      return (
        new Date(message.created_at).getTime() >
        new Date(lastReadAt).getTime()
      )
    }).length
  }

  const taskColumn = profile.role === 'admin' ? 'created_by' : 'assigned_to'

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq(taskColumn, user.id)
    .neq('status', 'done')

  return (
    <aside className="flex w-[290px] flex-col justify-between border-r border-[#ece5d8] bg-[#fffdf9] p-6">
      <div>
        <div className="mb-10">
          <div className="mb-3 inline-flex rounded-full border border-[#eadfbe] bg-[#fbf6e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#a88414]">
            Premium Workspace
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            RCX <span className="text-[#c9a227]">NETWORK</span>
          </h1>

          <p className="mt-2 text-sm text-[#7b746b]">
            Елегантна вътрешна платформа за екипа
          </p>
        </div>

        <SidebarNavLive
          currentUserId={user.id}
          role={profile.role}
          chatIds={chatIds}
          initialNotificationsCount={notificationsCount ?? 0}
          initialUnreadChatCount={unreadChatCount}
          initialTasksCount={tasksCount ?? 0}
        />
      </div>

      <div className="rounded-3xl border border-[#ece5d8] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#1f1a14]">
          {profile.full_name ?? user.email}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#7b746b]">
          {profile.role}
        </p>
      </div>
    </aside>
  )
}