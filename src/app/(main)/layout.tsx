import Sidebar from '@/components/Sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f5f6f8] flex">
      <Sidebar />

      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
}