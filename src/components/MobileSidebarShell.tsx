'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MobileNavLive from '@/components/MobileNavLive'

type MobileSidebarShellProps = {
  fullName: string
  role: string
  currentUserId: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
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

          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto border-r border-[#eadfbe] bg-[#f7f1df] px-4 py-5 shadow-2xl">
            <Link href="/feed" onClick={() => setOpen(false)} className="block">
              <div className="rounded-3xl border border-[#eadfbe] bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7f7460]">
                  Premium workspace
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1f1a14]">
                  RCX NETWORK
                </h2>
                <p className="mt-1 text-sm text-[#6b6358]">
                  Inside information platform
                </p>

                <div className="mt-4 rounded-2xl bg-[#f7f1df] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8b816f]">
                    Signed in as
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1f1a14]">
                    {fullName}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[#8b816f]">
                    {role}
                  </p>
                </div>
              </div>
            </Link>

            <MobileNavLive
              currentUserId={currentUserId}
              role={role}
              chatIds={chatIds}
              initialNotificationsCount={initialNotificationsCount}
              initialUnreadChatCount={initialUnreadChatCount}
              initialTasksCount={initialTasksCount}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}


