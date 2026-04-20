'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function MobileSidebar({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!isOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] xl:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />

      <div className="absolute left-0 top-0 flex h-full w-[86vw] max-w-[340px] flex-col border-r border-[#eadfbe] bg-[#fffdf8] shadow-2xl">
        <div className="border-b border-[#ece5d8] px-5 py-5">
          <div className="rounded-[24px] bg-gradient-to-br from-[#d4af37] via-[#c9a227] to-[#a88414] px-4 py-4 text-white shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
              PREMIUM WORKSPACE
            </p>
            <Link href="/feed" onClick={onClose} className="block">
              <h1 className="mt-2 text-xl font-black tracking-tight">
                RCX NETWORK
              </h1>
            </Link>
            <p className="mt-1 text-sm text-white/90">
              Inside information platform
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}