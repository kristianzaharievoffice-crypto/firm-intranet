import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function Badge({ count }: { count: number }) {
  if (!count) return null

  return (
    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-[#c9a227] px-2 py-1 text-xs font-semibold text-white">
      {count}
    </span>
  )
}

function NavItem({
  href,
  label,
  count = 0,
}: {
  href: string
  label: string
  count?: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#433b32] transition hover:bg-[#f7f1e2] hover:text-[#1f1a14]"
    >
      <span className="h-2 w-2 rounded-full bg-[#d9c9a0] transition group-hover:bg-[#c9a227]" />
      <span>{label}</span>
      <Badge count={count} />
    </Link>
  )
}

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

  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  let chatIds: string[] = []

  if (profile?.role === 'admin') {
    const { data: chats } = await supabase.from('chats').select('id')
    chatIds = (chats ?? []).map((c) => c.id)
  } else {
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .eq('employee_id', user.id)

    chatIds = (chats ?? []).map((c) => c.id)
  }

  const safeChatIds = chatIds.length
    ? chatIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: readRows } = await supabase
    .from('chat_reads')
    .select('chat_id, last_read_at')
    .eq('user_id', user.id)

  const { data: chatMessages } = await supabase
    .from('messages')
    .select('chat_id, created_at, sender_id')
    .in('chat_id', safeChatIds)

  const readMap = new Map(
    (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
  )

  const unreadChatCount = (chatMessages ?? []).filter((message) => {
    if (message.sender_id === user.id) return false
    const lastReadAt = readMap.get(message.chat_id)
    if (!lastReadAt) return true
    return (
      new Date(message.created_at).getTime() >
      new Date(lastReadAt).getTime()
    )
  }).length

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq(profile?.role === 'admin' ? 'created_by' : 'assigned_to', user.id)
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

        <nav className="space-y-1">
          <NavItem href="/wall" label="Стена" />
          <NavItem href="/chat" label="Чат" count={unreadChatCount} />
          <NavItem href="/tasks" label="Задачи" count={tasksCount ?? 0} />
          <NavItem href="/calendar" label="Календар" />
          <NavItem href="/events" label="Събития" />
          <NavItem href="/employees" label="Служители" />
          <NavItem
            href="/notifications"
            label="Известия"
            count={notificationsCount ?? 0}
          />
          {profile?.role === 'admin' && (
            <NavItem href="/dashboard" label="Dashboard" />
          )}
        </nav>
      </div>

      <div className="rounded-3xl border border-[#ece5d8] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#1f1a14]">
          {profile?.full_name ?? user.email}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#7b746b]">
          {profile?.role}
        </p>
      </div>
    </aside>
  )
}