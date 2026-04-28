'use client'

import Link from 'next/link'

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

export default function MobileNav({
  role,
  notificationsCount,
  unreadChatCount,
  tasksCount,
  onNavigate,
}: {
  role: string
  notificationsCount: number
  unreadChatCount: number
  tasksCount: number
  onNavigate: () => void
}) {
  return (
    <nav className="space-y-1">
      <NavItem href="/feed" label="Feed" onClick={onNavigate} />
      <NavItem href="/wall" label="Wall" onClick={onNavigate} />
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


