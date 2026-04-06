export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface Profile {
  id: string
  full_name: string | null
  role: string
}

interface Post {
  id: string
  content: string
  created_at: string
  employee_id: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) {
    redirect('/login')
  }

  if (me.role !== 'admin') {
    redirect('/wall')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'employee')

  const { data: posts } = await supabase
    .from('wall_posts')
    .select('id, content, created_at, employee_id')
    .order('created_at', { ascending: false })

  const employees = (profiles ?? []) as Profile[]
  const allPosts = (posts ?? []) as Post[]

  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Админ панел</h1>

        {employees.map((employee) => {
          const employeePosts = allPosts.filter((p) => p.employee_id === employee.id)

          return (
            <div key={employee.id} className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-1">
                {employee.full_name ?? 'Без име'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">Роля: {employee.role}</p>

              <div className="space-y-3">
                {employeePosts.length ? (
                  employeePosts.map((post) => (
                    <div key={post.id} className="border rounded-xl p-4">
                      <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleString('bg-BG')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Няма публикации.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}