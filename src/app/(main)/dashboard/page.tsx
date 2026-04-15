export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import ClientDateTime from '@/components/ClientDateTime'

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
    <main className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of activity, workload, and current company status."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={employeesCount ?? 0} />
        <StatCard label="Total posts" value={postsCount ?? 0} />
        <StatCard label="Open tasks" value={openTasksCount ?? 0} tone="soft" />
        <StatCard label="Upcoming events" value={upcomingEventsCount ?? 0} tone="gold" />
      </div>

      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          Recent activity
        </h2>

        {posts.length ? (
          <div className="mt-5 space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="text-sm font-semibold text-[#7b746b]">
                  Uploaded by:{' '}
                  {post.employee_id ? nameMap.get(post.employee_id) ?? 'User' : 'User'}
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[#1f1a14]">
                  {post.content}
                </p>

                <p className="mt-2 text-sm text-[#7b746b]">
                  <ClientDateTime value={post.created_at} />
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[#7b746b]">No recent activity yet.</p>
        )}
      </div>
    </main>
  )
}