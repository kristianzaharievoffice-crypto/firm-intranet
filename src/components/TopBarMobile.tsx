'use client'

export default function TopBarMobile({
  onOpenMenu,
}: {
  onOpenMenu: () => void
}) {
  return (
    <div className="sticky top-0 z-[90] border-b border-[#ece5d8] bg-[#fffdf8]/95 backdrop-blur xl:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
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
  )
}