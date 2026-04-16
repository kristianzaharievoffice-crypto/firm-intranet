export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import PostList from '@/components/PostList'
import SendWallPostForm from '@/components/SendWallPostForm'

interface WallPost {
  id: string
  content: string
  created_at: string
  status: string | null
  reviewed: boolean | null
  attachment_url: string | null
  employee_id: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
}

export default async function WallPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  let posts: WallPost[] = []

  if (me.role === 'admin') {
    const { data } = await supabase
      .from('wall_posts')
      .select('id, content, created_at, status, reviewed, attachment_url, employee_id')
      .order('created_at', { ascending: false })

    posts = (data ?? []) as WallPost[]
  } else {
    const { data } = await supabase
      .from('wall_posts')
      .select('id, content, created_at, status, reviewed, attachment_url, employee_id')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })

    posts = (data ?? []) as WallPost[]
  }

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

  const mappedPosts = posts.map((post) => ({
    ...post,
    employee_name: post.employee_id ? nameMap.get(post.employee_id) ?? 'User' : undefined,
  }))

  return (
    <main className="space-y-8">
      <PageHeader
        title="Wall"
        subtitle="Project reports, work updates, and progress posts."
      />

      {me.role !== 'admin' && <SendWallPostForm />}

      <PostList
        posts={mappedPosts}
        isAdmin={me.role === 'admin'}
        currentUserId={user.id}
      />
    </main>
  )
}