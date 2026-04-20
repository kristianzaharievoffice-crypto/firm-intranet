'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MobileNavLive from '@/components/MobileNavLive'

export default function MobileSidebarShell({
  fullName,
  role,
  currentUserId,
  chatIds,
  initialNotificationsCount,
  initialUnreadChatCount,
  initialTasksCount,
}: {
  fullName: string
  role: string
  currentUserId: string
  chatIds: string[]
  initialNotificationsCount: number
  initialUnreadChatCount: number
  initialTasksCount: number
}) {
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
      <div className="sticky top-0 z-[90] border-b border-[#ece5d8] bg-[#fffdf8]/95 backdrop-blur xl:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadfbe] bg-white text-[#1f1a14] shadow-sm"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a88414]">
              RCX NETWORK
            </p>
            <p className="text-xs text-[#7b746b]">Inside information platform</p>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] xl:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          <div className="absolute left-0 top-0 flex h-full w-[86vw] max-w-[340px] flex-col border-r border-[#eadfbe] bg-[#fffdf8] shadow-2xl">
            <div className="border-b border-[#ece5d8] px-5 py-5">
              <Link href="/feed" onClick={() => setOpen(false)} className="block">
                <div className="rounded-[24px] bg-gradient-to-br from-[#d4af37] via-[#c9a227] to-[#a88414] px-4 py-4 text-white shadow-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    PREMIUM WORKSPACE
                  </p>
                  <h1 className="mt-2 text-xl font-black tracking-tight">
                    RCX NETWORK
                  </h1>
                  <p className="mt-1 text-sm text-white/90">
                    Inside information platform
                  </p>
                </div>
              </Link>
            </div>

            <div className="px-4 py-4">
              <div className="mb-5 rounded-[24px] border border-[#ece5d8] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
                  Signed in as
                </p>
                <p className="mt-2 text-lg font-bold text-[#1f1a14]">
                  {fullName}
                </p>
                <p className="mt-1 text-sm text-[#7b746b]">{role}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
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
        </div>
      )}
    </>
  )
}