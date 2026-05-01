import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TopAnnouncementBar from '@/components/TopAnnouncementBar'
import LiveNotifications from '@/components/LiveNotifications'
import MarketTickerBar from '@/components/MarketTickerBar'
import PresenceHeartbeat from '@/components/PresenceHeartbeat'
import PersonalWhiteboardVisibility from '@/components/PersonalWhiteboardVisibility'
import CurrencyConverterLauncher from '@/components/CurrencyConverterLauncher'
import AiAssistantLauncher from '@/components/AiAssistantLauncher'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { error: touchPresenceError } = await supabase.rpc('touch_user_presence')

    if (touchPresenceError) {
      const presencePayload = {
        last_seen_at: new Date().toISOString(),
      }

      const { data: updatedPresenceRows } = await supabase
        .from('user_presence')
        .update(presencePayload)
        .eq('user_id', user.id)
        .select('user_id')

      if (!updatedPresenceRows?.length) {
        await supabase.from('user_presence').insert({
          user_id: user.id,
          ...presencePayload,
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {user && <PresenceHeartbeat currentUserId={user.id} />}

      {user && <TopAnnouncementBar />}

      {user && <MarketTickerBar />}

      <div className="min-h-[calc(100vh-49px)] xl:flex">
        {user && <Sidebar />}

        <main className="min-w-0 flex-1">
          {user && <LiveNotifications currentUserId={user.id} />}

          <div className="px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 xl:px-8 xl:py-8">
            {children}
          </div>
        </main>
      </div>

      {user && <AiAssistantLauncher />}

      {user && <CurrencyConverterLauncher />}

      {user && <PersonalWhiteboardVisibility userId={user.id} />}
    </div>
  )
}
