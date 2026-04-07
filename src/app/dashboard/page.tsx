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

  const { data: post } = await supabase
    .from('wall_posts')
    .select('id, employee_id, reviewed')
    .eq('id', postId)
    .single()

  if (!post) return

  await supabase
    .from('wall_posts')
    .update({ reviewed: true })
    .eq('id', postId)

  if (!post.reviewed) {
    await supabase.from('notifications').insert({
      user_id: post.employee_id,
      type: 'review',
      title: 'Постът ти беше прегледан',
      body: 'Администраторът маркира твоя пост като проверен.',
      link: '/wall',
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/wall')
  revalidatePath('/notifications')
}


async function changePostStatus(formData: FormData) {
  'use server'

  const postId = formData.get('postId') as string
  const status = formData.get('status') as string
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('wall_posts')
    .select('id, employee_id, status')
    .eq('id', postId)
    .single()

  if (!post) return

  await supabase
    .from('wall_posts')
    .update({ status })
    .eq('id', postId)

  if (post.status !== status) {
    await supabase.from('notifications').insert({
      user_id: post.employee_id,
      type: 'status',
      title: 'Статусът на твой пост беше сменен',
      body: `Новият статус е: ${status}`,
      link: '/wall',
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/wall')
  revalidatePath('/notifications')
}


async function deletePostFromDashboard(formData: FormData) {
  'use server'

  const postId = formData.get('postId') as string
  const supabase = await createClient()

  await supabase
    .from('wall_posts')
    .delete()
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; employee?: string }>
}) {
  const params = (await searchParams) ?? {}
  const selectedStatus = params.status ?? 'all'
  const selectedEmployee = params.employee ?? 'all'

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

  if (!me || me.role !== 'admin') {
    redirect('/wall')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'employee')
    .order('full_name', { ascending: true })

  const { data: posts } = await supabase
    .from('wall_posts')
    .select('id, content, created_at, employee_id, status, reviewed')
    .order('created_at', { ascending: false })

  const employees = (profiles ?? []) as Profile[]
  const allPosts = (posts ?? []) as Post[]

  const visibleEmployees = employees.filter((employee) => {
    if (selectedEmployee !== 'all' && employee.id !== selectedEmployee) {
      return false
    }

    const employeePosts = allPosts.filter((post) => {
      const sameEmployee = post.employee_id === employee.id
      const sameStatus =
        selectedStatus === 'all' ? true : post.status === selectedStatus
      return sameEmployee && sameStatus
    })

    return employeePosts.length > 0 || selectedEmployee === employee.id
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Админ панел
          </h1>
          <p className="text-gray-500 mt-2">
            Преглед, филтриране и управление на постовете
          </p>
        </div>

        <form
          method="get"
          className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Служител
            </label>
            <select
              name="employee"
              defaultValue={selectedEmployee}
              className="w-full border rounded-2xl px-4 py-3 bg-white"
            >
              <option value="all">Всички</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name ?? 'Без име'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус
            </label>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="w-full border rounded-2xl px-4 py-3 bg-white"
            >
              <option value="all">Всички</option>
              <option value="в процес">В процес</option>
              <option value="за проверка">За проверка</option>
              <option value="готово">Готово</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-black text-white px-5 py-3 rounded-2xl"
          >
            Филтрирай
          </button>
        </form>

        {visibleEmployees.length ? (
          visibleEmployees.map((employee) => {
            const employeePosts = allPosts.filter((post) => {
              const sameEmployee = post.employee_id === employee.id
              const sameStatus =
                selectedStatus === 'all' ? true : post.status === selectedStatus
              return sameEmployee && sameStatus
            })

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
                        <div className="flex items-center justify-between mb-3 gap-4">
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
                          <span className="text-green-600 text-sm font-medium block mb-4">
                            ✔ Проверено
                          </span>
                        ) : (
                          <div className="mb-4">
                            <span className="text-blue-600 text-sm font-medium block mb-2">
                              ⏳ Чака проверка
                            </span>

                            <form action={markReviewed}>
                              <input type="hidden" name="postId" value={post.id} />
                              <button
                                type="submit"
                                className="text-sm bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                              >
                                Маркирай като проверено
                              </button>
                            </form>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 items-center">
                          <form action={changePostStatus} className="flex gap-2 items-center">
                            <input type="hidden" name="postId" value={post.id} />

                            <select
                              name="status"
                              defaultValue={post.status}
                              className="border rounded-xl px-3 py-2 bg-white text-sm"
                            >
                              <option value="в процес">В процес</option>
                              <option value="за проверка">За проверка</option>
                              <option value="готово">Готово</option>
                            </select>

                            <button
                              type="submit"
                              className="text-sm bg-black text-white px-3 py-2 rounded-xl"
                            >
                              Смени статус
                            </button>
                          </form>

                          <form action={deletePostFromDashboard}>
                            <input type="hidden" name="postId" value={post.id} />
                            <button
                              type="submit"
                              className="text-sm text-red-600 hover:underline"
                            >
                              Изтрий пост
                            </button>
                          </form>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Няма постове по тези филтри.</p>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
            <p className="text-gray-500">Няма намерени резултати.</p>
          </div>
        )}
      </div>
    </main>
  )
}
