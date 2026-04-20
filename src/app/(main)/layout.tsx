import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TopAnnouncementBar from '@/components/TopAnnouncementBar'
import LiveNotifications from '@/components/LiveNotifications'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen xl:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 xl:px-8 xl:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}