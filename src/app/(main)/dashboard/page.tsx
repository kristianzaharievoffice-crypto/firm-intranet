export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import ClientDateTime from '@/components/ClientDateTime'
import MarketWidget from '@/components/MarketWidget'

interface WallPostRow {
  id: string
  content: string
  created_at: string
  employee_id: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
}

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
    .select('id, content, created_at, employee_id')
    .order('created_at', { ascending: false })
    .limit(5)

  const posts = (recentPosts ?? []) as WallPostRow[]

  const employeeIds = [...new Set(posts.map((p) => p.employee_id).filter(Boolean))] as string[]

  const safeIds = employeeIds.length
    ? employeeIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeIds)

  const nameMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p.full_name ?? 'User'])
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Premium internal company overview"
        action={<ClientDateTime value={new Date().toISOString()} mode="datetime" />}
      />

      <MarketWidget />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Employees"
          value={employeesCount ?? 0}
          subtitle="Total registered profiles"
        />
        <StatCard
          title="Wall Posts"
          value={postsCount ?? 0}
          subtitle="Total company wall posts"
        />
        <StatCard
          title="Open Tasks"
          value={openTasksCount ?? 0}
          subtitle="Tasks not marked as done"
        />
        <StatCard
          title="Upcoming Events"
          value={upcomingEventsCount ?? 0}
          subtitle="Scheduled from today onward"
        />
      </div>

      <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Recent activity
        </h2>

        {posts.length ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/60 p-4"
              >
                <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                  Uploaded by{' '}
                  <span className="font-medium text-neutral-700">
                    {post.employee_id
                      ? nameMap.get(post.employee_id) ?? 'User'
                      : 'User'}
                  </span>
                </div>

                <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">
                  {post.content}
                </div>

                <div className="mt-3 text-xs text-neutral-500">
                  {new Date(post.created_at).toLocaleString('en-GB')}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">No recent activity yet.</div>
        )}
      </section>
    </div>
  )
}
