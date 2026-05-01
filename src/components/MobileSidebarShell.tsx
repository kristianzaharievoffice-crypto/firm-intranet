'use client'

import { Component, ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import SidebarNavLive from '@/components/SidebarNavLive'
import OnlineNowSidebar from '@/components/OnLineNowSidebar'

type MobileSidebarShellProps = {
  fullName: string
  role: string
  currentUserId: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
}

class MobileMenuSectionBoundary extends Component<
  { children: ReactNode; label: string },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`Mobile menu ${this.props.label} error:`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-4 rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          This menu section could not load.
        </div>
      )
    }

    return this.props.children
  }
}

export default function MobileSidebarShell({
  fullName,
  role,
  currentUserId,
  chatIds,
  initialNotificationsCount,
  initialUnreadChatCount,
  initialTasksCount,
}: MobileSidebarShellProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-[90] inline-flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#eadfbe] bg-white/95 shadow-lg backdrop-blur xl:hidden"
        >
          <span className="h-0.5 w-5 rounded-full bg-[#1f1a14]" />
          <span className="h-0.5 w-5 rounded-full bg-[#1f1a14]" />
          <span className="h-0.5 w-5 rounded-full bg-[#1f1a14]" />
        </button>
      ) : null}
      {open && (
        <div className="fixed inset-0 z-[80] xl:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto border-r border-[#ece5d8] bg-[#fffdf8] px-5 py-6 shadow-2xl">
            <Link
              href="/feed"
              onClick={() => setOpen(false)}
              prefetch={false}
              className="block"
            >
              <div className="rounded-[28px] bg-gradient-to-br from-[#d4af37] via-[#c9a227] to-[#a88414] px-5 py-5 text-white shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                  PREMIUM WORKSPACE
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                  RCX NETWORK
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Inside information platform
                </p>
              </div>
            </Link>

            <div className="mt-6 rounded-[28px] border border-[#ece5d8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
                Signed in as
              </p>
              <p className="mt-2 text-lg font-bold text-[#1f1a14]">{fullName}</p>
              <p className="mt-1 text-sm text-[#7b746b]">{role}</p>
            </div>

            <MobileMenuSectionBoundary label="navigation">
              <div className="mt-6">
                <SidebarNavLive
                  currentUserId={currentUserId}
                  role={role}
                  chatIds={chatIds}
                  initialNotificationsCount={initialNotificationsCount}
                  initialUnreadChatCount={initialUnreadChatCount}
                  initialTasksCount={initialTasksCount}
                  instanceId="mobile"
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </MobileMenuSectionBoundary>

            <MobileMenuSectionBoundary label="online users">
              <div className="mt-4">
                <OnlineNowSidebar currentUserId={currentUserId} instanceId="mobile" />
              </div>
            </MobileMenuSectionBoundary>
          </div>
        </div>
      )}
    </>
  )
}

