'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
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
  count = 0,
  onClick,
}: {
  href: string
  label: string
  count?: number
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
        isActive
          ? 'bg-[#1f1a14] text-white'
          : 'text-[#433b32] hover:bg-[#f7f1e2] hover:text-[#1f1a14]'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition ${
          isActive ? 'bg-white' : 'bg-[#d9c9a0] group-hover:bg-[#c9a227]'
        }`}
      />
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

type SidebarNavLiveProps = {
  currentUserId: string
  role: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
  onNavigate?: () => void
}

export default function SidebarNavLive({
  currentUserId,
  role,
  chatIds,
  initialNotificationsCount,
  initialUnreadChatCount,
  initialTasksCount,
  onNavigate,
}: SidebarNavLiveProps) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const currentOpenChatId = extractChatId(pathname)

  const [notificationsCount, setNotificationsCount] = useState(
    initialNotificationsCount
  )
  const [unreadChatCount, setUnreadChatCount] = useState(initialUnreadChatCount)
  const [tasksCount, setTasksCount] = useState(initialTasksCount)

  const clearOpenChatNotifications = async () => {
    if (!currentOpenChatId) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('type', 'chat')
      .eq('link', `/chat/${currentOpenChatId}`)
      .eq('is_read', false)

    if (error) {
      console.error('sidebar clear open chat notifications error:', error)
    }
  }

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

    const { data: readRows, error: readError } = await supabase
      .from('chat_reads')
      .select('chat_id, last_read_at')
      .eq('user_id', currentUserId)

    if (readError) {
      console.error('sidebar chat_reads error:', readError)
      return
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('chat_id, created_at, sender_id')
      .in('chat_id', effectiveChatIds)

    if (messagesError) {
      console.error('sidebar messages error:', messagesError)
      return
    }

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

  const refreshNotificationCount = async () => {
    await clearOpenChatNotifications()

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, link')
      .eq('user_id', currentUserId)
      .eq('is_read', false)

    if (error) {
      console.error('sidebar notifications error:', error)
      return
    }

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

  const refreshTasksCount = async () => {
    const taskColumn = role === 'admin' ? 'created_by' : 'assigned_to'

    const { count: openTasksCount, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq(taskColumn, currentUserId)
      .neq('status', 'done')

    if (error) {
      console.error('sidebar tasks error:', error)
      return
    }

    setTasksCount(openTasksCount ?? 0)
  }

  const refreshCounts = async () => {
    await refreshNotificationCount()
    await refreshChatUnreadCount()
    await refreshTasksCount()
  }

  useEffect(() => {
    void refreshCounts()
  }, [currentOpenChatId])

  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshCounts()
      }
    }, 2500)

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
          void refreshNotificationCount()
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
          void refreshChatUnreadCount()
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
          void refreshChatUnreadCount()
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
          void refreshTasksCount()
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
    <nav className="space-y-1">
      <NavItem href="/feed" label="Feed" onClick={onNavigate} />
      <NavItem href="/wall" label="Wall" onClick={onNavigate} />
      <NavItem href="/mail" label="Mail" onClick={onNavigate} />
      <NavItem href="/chat" label="Chat" count={unreadChatCount} onClick={onNavigate} />
      <NavItem href="/calls" label="Calls" onClick={onNavigate} />
      <NavItem href="/tasks" label="Tasks" count={tasksCount} onClick={onNavigate} />
      <NavItem href="/projects" label="Projects" onClick={onNavigate} />
      <NavItem href="/pamm" label="PAMM" onClick={onNavigate} />
      <NavItem href="/mt5" label="MT5" onClick={onNavigate} />
      <NavItem href="/fund" label="FUND" onClick={onNavigate} />
      <NavItem href="/sma" label="SMA" onClick={onNavigate} />
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


