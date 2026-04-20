'use client'

import Link from 'next/link'

function NavItem({
  href,
  label,
  onClick,
}: {
  href: string
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#433b32] transition hover:bg-[#f7f1e2] hover:text-[#1f1a14]"
    >
      <span className="h-2 w-2 rounded-full bg-[#d9c9a0] transition group-hover:bg-[#c9a227]" />
      <span>{label}</span>
    </Link>
  )
}

export default function MobileNav({
  role,
  onNavigate,
}: {
  role: string
  onNavigate: () => void
}) {
  return (
    <nav className="space-y-1">
      <NavItem href="/feed" label="Feed" onClick={onNavigate} />
      <NavItem href="/wall" label="Wall" onClick={onNavigate} />
      <NavItem href="/chat" label="Chat" onClick={onNavigate} />
      <NavItem href="/tasks" label="Tasks" onClick={onNavigate} />
      <NavItem href="/projects" label="Projects" onClick={onNavigate} />
      <NavItem href="/pamm" label="PAMM" onClick={onNavigate} />
      <NavItem href="/documents" label="Documents" onClick={onNavigate} />
      <NavItem href="/calendar" label="Calendar" onClick={onNavigate} />
      <NavItem href="/events" label="Events" onClick={onNavigate} />
      <NavItem href="/employees" label="Employees" onClick={onNavigate} />
      <NavItem href="/notifications" label="Notifications" onClick={onNavigate} />
      {role === 'admin' && (
        <NavItem href="/dashboard" label="Dashboard" onClick={onNavigate} />
      )}
      {role === 'admin' && (
        <NavItem href="/admin" label="Admin Panel" onClick={onNavigate} />
      )}
    </nav>
  )
}