import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNavLive from '@/components/SidebarNavLive'
import MobileSidebarShell from '@/components/MobileSidebarShell'
import OnlineNowSidebar from '@/components/OnLineNowSidebar' // ✅ ДОБАВЕНО

interface ChatRow {
  id: string
  user1_id: string | null
  user2_id: string | null
  admin_id: string | null
  employee_id: string | null
}

export default async function Sidebar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error: touchPresenceError } = await supabase.rpc('touch_user_presence')

  if (touchPresenceError) {
    const presencePayload = {
      last_seen_at: new Date().toISOString(),
    }

    const { data: updatedPresenceRows } = await supabase
      .from('user_presence')
      .update(presencePayload)
      .eq('user_id', user.id)
      .select('user_id')

    if (!updatedPresenceRows?.length) {
      await supabase.from('user_presence').insert({
        user_id: user.id,
        ...presencePayload,
      })
    }
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const { data: chats } = await supabase
    .from('chats')
    .select('id, user1_id, user2_id, admin_id, employee_id')

  const myChats = ((chats ?? []) as ChatRow[]).filter((chat) => {
    const a = chat.user1_id ?? chat.admin_id
    const b = chat.user2_id ?? chat.employee_id
    return a === user.id || b === user.id
  })

  const chatIds = myChats.map((chat) => chat.id)

  let unreadChatCount = 0

  if (chatIds.length) {
    const { data: readRows } = await supabase
      .from('chat_reads')
      .select('chat_id, last_read_at')
      .eq('user_id', user.id)

    const readMap = new Map(
      (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
    )

    const { data: messages } = await supabase
      .from('messages')
      .select('chat_id, created_at, sender_id')
      .in('chat_id', chatIds)

    unreadChatCount = (messages ?? []).filter((msg) => {
      if (msg.sender_id === user.id) return false

      const lastRead = readMap.get(msg.chat_id)
      if (!lastRead) return true

      return new Date(msg.created_at) > new Date(lastRead)
    }).length
  }

  const taskColumn = me.role === 'admin' ? 'created_by' : 'assigned_to'

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq(taskColumn, user.id)
    .neq('status', 'done')

  return (
    <>
      <MobileSidebarShell
        fullName={me.full_name || 'User'}
        role={me.role}
        currentUserId={user.id}
        chatIds={chatIds}
        initialNotificationsCount={notificationsCount ?? 0}
        initialUnreadChatCount={unreadChatCount}
        initialTasksCount={tasksCount ?? 0}
      />

      <aside className="hidden w-[310px] shrink-0 border-r border-[#ece5d8] bg-[#fffdf8] xl:block">
        <div className="flex h-full flex-col px-6 py-7">
          <Link href="/feed" className="block">
            <div className="rounded-[28px] bg-gradient-to-br from-[#d4af37] via-[#c9a227] to-[#a88414] px-5 py-5 text-white shadow-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                PREMIUM WORKSPACE
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
                RCX NETWORK
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/90">
                Inside information platform
              </p>
            </div>
          </Link>

          <div className="mt-6 rounded-[28px] border border-[#ece5d8] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
              Signed in as
            </p>
            <p className="mt-2 text-lg font-bold text-[#1f1a14]">
              {me.full_name || 'User'}
            </p>
            <p className="mt-1 text-sm text-[#7b746b]">{me.role}</p>
          </div>

          <div className="mt-6">
            <SidebarNavLive
              currentUserId={user.id}
              role={me.role}
              chatIds={chatIds}
              initialNotificationsCount={notificationsCount ?? 0}
              initialUnreadChatCount={unreadChatCount}
              initialTasksCount={tasksCount ?? 0}
              instanceId="desktop"
            />
          </div>

          {/* ✅ ТУК СЕ ДОБАВЯ ONLINE USERS */}
          <div className="mt-4">
            <OnlineNowSidebar currentUserId={user.id} instanceId="desktop" />
          </div>
        </div>
      </aside>
    </>
  )
}

