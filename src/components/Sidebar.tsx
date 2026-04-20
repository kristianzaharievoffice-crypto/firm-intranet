'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SidebarNavLive from '@/components/SidebarNavLive'
import MobileSidebar from '@/components/MobileSidebar'
import TopBarMobile from '@/components/TopBarMobile'

interface ChatRow {
  id: string
  user1_id: string | null
  user2_id: string | null
  admin_id: string | null
  employee_id: string | null
}

interface SidebarData {
  userId: string
  fullName: string
  role: string
  notificationsCount: number
  unreadChatCount: number
  tasksCount: number
  chatIds: string[]
}

function DesktopSidebar({
  data,
}: {
  data: SidebarData
}) {
  return (
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
            {data.fullName || 'User'}
          </p>
          <p className="mt-1 text-sm text-[#7b746b]">{data.role}</p>
        </div>

        <div className="mt-6 flex-1">
          <SidebarNavLive
            currentUserId={data.userId}
            role={data.role}
            chatIds={data.chatIds}
            initialNotificationsCount={data.notificationsCount}
            initialUnreadChatCount={data.unreadChatCount}
            initialTasksCount={data.tasksCount}
          />
        </div>
      </div>
    </aside>
  )
}

export default function Sidebar() {
  const supabase = useMemo(() => createClient(), [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [data, setData] = useState<SidebarData | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .single()

      if (!me) {
        window.location.href = '/login'
        return
      }

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
        const { data: reads } = await supabase
          .from('chat_reads')
          .select('chat_id, last_read_at')
          .eq('user_id', user.id)
          .in('chat_id', chatIds)

        const { data: messages } = await supabase
          .from('messages')
          .select('chat_id, created_at, sender_id')
          .in('chat_id', chatIds)

        const readMap = new Map(
          (reads ?? []).map((row) => [row.chat_id, row.last_read_at])
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

      const taskColumn = me.role === 'admin' ? 'created_by' : 'assigned_to'

      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq(taskColumn, user.id)
        .neq('status', 'done')

      setData({
        userId: user.id,
        fullName: me.full_name || 'User',
        role: me.role,
        notificationsCount: notificationsCount ?? 0,
        unreadChatCount,
        tasksCount: tasksCount ?? 0,
        chatIds,
      })
    }

    void load()
  }, [supabase])

  if (!data) {
    return (
      <>
        <div className="xl:hidden">
          <TopBarMobile onOpenMenu={() => setMobileOpen(true)} />
        </div>
        <aside className="hidden w-[310px] shrink-0 border-r border-[#ece5d8] bg-[#fffdf8] xl:block" />
      </>
    )
  }

  const nav = (
    <SidebarNavLive
      currentUserId={data.userId}
      role={data.role}
      chatIds={data.chatIds}
      initialNotificationsCount={data.notificationsCount}
      initialUnreadChatCount={data.unreadChatCount}
      initialTasksCount={data.tasksCount}
    />
  )

  return (
    <>
      <div className="xl:hidden">
        <TopBarMobile onOpenMenu={() => setMobileOpen(true)} />
        <MobileSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div className="mb-5 rounded-[24px] border border-[#ece5d8] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
              Signed in as
            </p>
            <p className="mt-2 text-lg font-bold text-[#1f1a14]">
              {data.fullName}
            </p>
            <p className="mt-1 text-sm text-[#7b746b]">{data.role}</p>
          </div>

          <div onClick={() => setMobileOpen(false)}>{nav}</div>
        </MobileSidebar>
      </div>

      <DesktopSidebar data={data} />
    </>
  )
}