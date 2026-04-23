'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function Badge({ count }: { count: number }) {
  if (!count) return null

  return (
    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[#1f1a14] px-2 py-0.5 text-xs font-semibold text-white">
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
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
        isActive
          ? 'bg-[#1f1a14] text-white'
          : 'text-[#1f1a14] hover:bg-white/70'
      }`}
    >
      <span>{label}</span>
      <Badge count={count} />
    </Link>
  )
}

function extractChatId(path: string | null | undefined) {
  if (!path) return null
  const match = path.match(/^\/chat\/([a-z0-9-]+)$/i)
  return match ? match[1] : null
}

export default function SidebarNavLive({
  currentUserId,
  role,
  chatIds,
  initialNotificationsCount,
  initialUnreadChatCount,
  initialTasksCount,
}: {
  currentUserId: string
  role: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
}) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const currentOpenChatId = extractChatId(pathname)

  const [notificationsCount, setNotificationsCount] = useState(
    initialNotificationsCount
  )
  const [unreadChatCount, setUnreadChatCount] = useState(initialUnreadChatCount)
  const [tasksCount, setTasksCount] = useState(initialTasksCount)

  const refreshChatUnreadCount = async () => {
    if (!chatIds.length) {
      setUnreadChatCount(0)
      return
    }

    const effectiveChatIds = currentOpenChatId
      ? chatIds.filter((id) => id !== currentOpenChatId)
      : chatIds

    if (!effectiveChatIds.length) {
      setUnreadChatCount(0)
      return
    }

    const { data: readRows } = await supabase
      .from('chat_reads')
      .select('chat_id, last_read_at')
      .eq('user_id', currentUserId)

    const { data: messages } = await supabase
      .from('messages')
      .select('chat_id, created_at, sender_id')
      .in('chat_id', effectiveChatIds)

    const readMap = new Map(
      (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
    )

    const unreadCount = (messages ?? []).filter((message) => {
      if (message.sender_id === currentUserId) return false
      const lastReadAt = readMap.get(message.chat_id)
      if (!lastReadAt) return true

      return (
        new Date(message.created_at).getTime() > new Date(lastReadAt).getTime()
      )
    }).length

    setUnreadChatCount(unreadCount)
  }

  const refreshNotificationCount = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, link')
      .eq('user_id', currentUserId)
      .eq('is_read', false)

    const count = (data ?? []).filter((notification) => {
      if (notification.type !== 'chat') return true

      const notificationChatId =
        typeof notification.link === 'string'
          ? extractChatId(notification.link)
          : null

      if (!notificationChatId || !currentOpenChatId) return true

      return notificationChatId !== currentOpenChatId
    }).length

    setNotificationsCount(count)
  }

  const refreshCounts = async () => {
    await refreshNotificationCount()
    await refreshChatUnreadCount()

    const taskColumn = role === 'admin' ? 'created_by' : 'assigned_to'

    const { count: openTasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq(taskColumn, currentUserId)
      .neq('status', 'done')

    setTasksCount(openTasksCount ?? 0)
  }

  useEffect(() => {
    void refreshCounts()

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshCounts()
      }
    }, 2000)

    const notificationChannel = supabase
      .channel(`sidebar-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void refreshCounts()
        }
      )
      .subscribe()

    const messageChannel = supabase
      .channel(`sidebar-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          void refreshCounts()
        }
      )
      .subscribe()

    const readChannel = supabase
      .channel(`sidebar-chat-reads-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void refreshCounts()
        }
      )
      .subscribe()

    const tasksChannel = supabase
      .channel(`sidebar-tasks-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          void refreshCounts()
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(notificationChannel)
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(readChannel)
      supabase.removeChannel(tasksChannel)
    }
  }, [currentUserId, role, supabase, currentOpenChatId, chatIds.join(',')])

  return (
    <nav className="mt-6 space-y-2">
      <NavItem href="/feed" label="Feed" />
      <NavItem href="/wall" label="Wall" />
      <NavItem href="/employees" label="Employees" />
      <NavItem href="/documents" label="Documents" />
      <NavItem href="/projects" label="Projects" />
      <NavItem href="/tasks" label="Tasks" count={tasksCount} />
      <NavItem href="/calendar" label="Calendar" />
      <NavItem href="/events" label="Events" />
      <NavItem href="/chat" label="Chat" count={unreadChatCount} />
      <NavItem href="/notifications" label="Notifications" count={notificationsCount} />
      <NavItem href="/calls" label="Calls" />

      {role === 'admin' && <NavItem href="/dashboard" label="Dashboard" />}
      {role === 'admin' && <NavItem href="/admin" label="Admin" />}
    </nav>
  )
}
