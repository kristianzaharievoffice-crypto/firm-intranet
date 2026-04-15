export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { uiText } from '@/lib/ui-text'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'admin') redirect('/feed')

  const { count: employeesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: postsCount } = await supabase
    .from('wall_posts')
    .select('*', { count: 'exact', head: true })

  const { count: openTasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'done')

  const today = new Date().toISOString().slice(0, 10)

  const { count: upcomingEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('date', today)

  const { data: recentPosts } = await supabase
    .from('wall_posts')
    .select('id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.dashboard.title}
        subtitle={uiText.dashboard.subtitle}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={uiText.dashboard.totalEmployees} value={employeesCount ?? 0} />
        <StatCard label={uiText.dashboard.totalPosts} value={postsCount ?? 0} />
        <StatCard label={uiText.dashboard.openTasks} value={openTasksCount ?? 0} tone="soft" />
        <StatCard label={uiText.dashboard.upcomingEvents} value={upcomingEventsCount ?? 0} tone="gold" />
      </div>

      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          {uiText.dashboard.recentActivity}
        </h2>

        {recentPosts?.length ? (
          <div className="mt-5 space-y-4">
            {recentPosts.map((post) => (
              <div key={post.id} className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="whitespace-pre-wrap text-[#1f1a14]">{post.content}</p>
                <p className="mt-2 text-sm text-[#7b746b]">
                  {new Date(post.created_at).toLocaleString('bg-BG')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[#7b746b]">{uiText.dashboard.noRecentActivity}</p>
        )}
      </div>
    </main>
  )
}