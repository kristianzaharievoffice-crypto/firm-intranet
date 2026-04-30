  import { createClient } from '@/lib/supabase/server'
  import Sidebar from '@/components/Sidebar'
  import TopAnnouncementBar from '@/components/TopAnnouncementBar'
  import LiveNotifications from '@/components/LiveNotifications'
  import MarketTickerBar from '@/components/MarketTickerBar'
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

    return (
      <div className="min-h-screen bg-transparent">
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


