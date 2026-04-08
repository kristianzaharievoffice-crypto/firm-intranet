import Sidebar from '@/components/Sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-[#ece5d8] bg-white/70 shadow-[0_20px_60px_rgba(31,26,20,0.08)] backdrop-blur">
          <Sidebar />
          <main className="modern-scroll flex-1 overflow-y-auto bg-[#fcfbf8]">
            <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}