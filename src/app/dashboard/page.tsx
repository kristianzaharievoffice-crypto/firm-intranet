export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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
  status: string
  reviewed: boolean
}

async function markReviewed(formData: FormData) {
  'use server'

  const postId = formData.get('postId') as string
  const supabase = await createClient()

  await supabase
    .from('wall_posts')
    .update({ reviewed: true })
    .eq('id', postId)

  revalidatePath('/dashboard')
  revalidatePath('/wall')
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'готово':
      return 'bg-green-100 text-green-700'
    case 'за проверка':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-blue-100 text-blue-700'
  }
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
    .select('id, content, created_at, employee_id, status, reviewed')
    .order('created_at', { ascending: false })

  const employees = (profiles ?? []) as Profile[]
  const allPosts = (posts ?? []) as Post[]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Админ панел
          </h1>
          <p className="text-gray-500 mt-2">
            Преглед на служителите и техните проекти
          </p>
        </div>

        {employees.map((employee) => {
          const employeePosts = allPosts.filter(
            (p) => p.employee_id === employee.id
          )

          return (
            <div
              key={employee.id}
              className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-2xl font-bold mb-1">
                {employee.full_name ?? 'Без име'}
              </h2>

              <p className="text-sm text-gray-500 mb-4">
                Роля: {employee.role}
              </p>

              <div className="space-y-4">
                {employeePosts.length ? (
                  employeePosts.map((post) => (
                    <div
                      key={post.id}
                      className="border rounded-2xl p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusClasses(
                            post.status
                          )}`}
                        >
                          {post.status}
                        </span>

                        <p className="text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleString('bg-BG')}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      {post.reviewed ? (
                        <span className="text-green-600 text-sm font-medium">
                          ✔ Проверено
                        </span>
                      ) : (
                        <div className="space-y-3">
                          <span className="text-blue-600 text-sm font-medium block">
                            ⏳ Чака проверка
                          </span>

                          <form action={markReviewed}>
                            <input
                              type="hidden"
                              name="postId"
                              value={post.id}
                            />
                            <button className="text-sm bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
                              Маркирай като проверено
                            </button>
                          </form>
                        </div>
                      )}
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