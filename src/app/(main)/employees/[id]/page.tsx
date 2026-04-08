export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface EmployeeProfile {
  id: string
  full_name: string | null
  role: string
  job_title: string | null
  department: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
}

interface PostItem {
  id: string
  content: string
  status: string
  reviewed: boolean
  created_at: string
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) {
    redirect('/login')
  }

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, phone, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!employee) {
    redirect('/employees')
  }

  let posts: PostItem[] = []

  if (me.role === 'admin' || me.id === employee.id) {
    const { data } = await supabase
      .from('wall_posts')
      .select('id, content, status, reviewed, created_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    posts = (data ?? []) as PostItem[]
  }

  const item = employee as EmployeeProfile

  return (
    <main className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-3xl overflow-hidden">
            {item.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.avatar_url}
                alt={item.full_name ?? 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              (item.full_name?.[0] ?? 'U').toUpperCase()
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight">
              {item.full_name ?? 'Без име'}
            </h1>
            <p className="text-gray-500 mt-2">
              {item.job_title || 'Без длъжност'} • {item.department || 'Без отдел'}
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#fafafa] rounded-2xl p-4 border border-gray-100">
                <p className="text-gray-400 mb-1">Роля</p>
                <p className="font-medium">{item.role}</p>
              </div>

              <div className="bg-[#fafafa] rounded-2xl p-4 border border-gray-100">
                <p className="text-gray-400 mb-1">Телефон</p>
                <p className="font-medium">{item.phone || 'Няма'}</p>
              </div>
            </div>

            <div className="mt-4 bg-[#fafafa] rounded-2xl p-4 border border-gray-100">
              <p className="text-gray-400 mb-1">Описание</p>
              <p className="font-medium">{item.bio || 'Няма описание'}</p>
            </div>
          </div>
        </div>
      </div>

      {(me.role === 'admin' || me.id === item.id) && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold mb-4">Постове</h2>

          {posts.length ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-100 rounded-3xl p-5 bg-[#fafafa]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                      {post.status}
                    </span>

                    <p className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleString('bg-BG')}
                    </p>
                  </div>

                  <p className="whitespace-pre-wrap text-gray-800">{post.content}</p>

                  <p className="mt-3 text-sm font-medium">
                    {post.reviewed ? '✔ Проверено' : '⏳ Чака проверка'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Няма постове.</p>
          )}
        </div>
      )}
    </main>
  )
}