'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  onClick,
  count = 0,
}: {
  href: string
  label: string
  onClick: () => void
  count?: number
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#433b32] transition hover:bg-[#f7f1e2] hover:text-[#1f1a14]"
    >
      <span className="h-2 w-2 rounded-full bg-[#d9c9a0] transition group-hover:bg-[#c9a227]" />
      <span>{label}</span>
      <Badge count={count} />
    </Link>
  )
}

export default function MobileNavLive({
  currentUserId,
  role,
  chatIds,
  initialNotificationsCount,
  initialUnreadChatCount,
  initialTasksCount,
  onNavigate,
}: {
  currentUserId: string
  role: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
  onNavigate: () => void
}) {
  const supabase = useMemo(() => createClient(), [])

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

    const { data: readRows } = await supabase
      .from('chat_reads')
      .select('chat_id, last_read_at')
      .eq('user_id', currentUserId)

    const { data: messages } = await supabase
      .from('messages')
      .select('chat_id, created_at, sender_id')
      .in('chat_id', chatIds)

    const readMap = new Map(
      (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
    )

    const unreadCount = (messages ?? []).filter((message) => {
      if (message.sender_id === currentUserId) return false

      const lastReadAt = readMap.get(message.chat_id)
      if (!lastReadAt) return true

      return (
        new Date(message.created_at).getTime() >
        new Date(lastReadAt).getTime()
      )
    }).length

    setUnreadChatCount(unreadCount)
  }

  const refreshCounts = async () => {
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('is_read', false)

    setNotificationsCount(notifCount ?? 0)

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
    }, 3000)

    const notificationChannel = supabase
      .channel(`mobile-notifications-${currentUserId}`)
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
      .channel(`mobile-messages-${currentUserId}`)
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
      .channel(`mobile-chat-reads-${currentUserId}`)
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
      .channel(`mobile-tasks-${currentUserId}`)
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
  }, [currentUserId, role, supabase, chatIds.join(',')])

  return (
    <nav className="space-y-1">
      <NavItem href="/feed" label="Feed" onClick={onNavigate} />
      <NavItem href="/wall" label="Wall" onClick={onNavigate} />
      <NavItem href="/chat" label="Chat" count={unreadChatCount} onClick={onNavigate} />
      <NavItem href="/tasks" label="Tasks" count={tasksCount} onClick={onNavigate} />
      <NavItem href="/projects" label="Projects" onClick={onNavigate} />
      <NavItem href="/pamm" label="PAMM" onClick={onNavigate} />
      <NavItem href="/documents" label="Documents" onClick={onNavigate} />
      <NavItem href="/calendar" label="Calendar" onClick={onNavigate} />
      <NavItem href="/events" label="Events" onClick={onNavigate} />
      <NavItem href="/employees" label="Employees" onClick={onNavigate} />
      <NavItem
        href="/notifications"
        label="Notifications"
        count={notificationsCount}
        onClick={onNavigate}
      />
      {role === 'admin' && (
        <NavItem href="/dashboard" label="Dashboard" onClick={onNavigate} />
      )}
      {role === 'admin' && (
        <NavItem href="/admin" label="Admin Panel" onClick={onNavigate} />
      )}
    </nav>
  )
}