export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import PostComments from '@/components/PostComments'

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
  attachment_url?: string | null
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

  await supabase.from('wall_posts').update({ reviewed: true }).eq('id', postId)

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

  await supabase.from('wall_posts').update({ status }).eq('id', postId)

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

  await supabase.from('wall_posts').delete().eq('id', postId)

  revalidatePath('/dashboard')
  revalidatePath('/wall')
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'готово':
      return 'bg-green-100 text-green-700'
    case 'за проверка':
      return 'bg-amber-100 text-amber-700'
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

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'admin') redirect('/wall')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'employee')
    .order('full_name', { ascending: true })

  const { data: posts } = await supabase
    .from('wall_posts')
    .select('id, content, created_at, employee_id, status, reviewed, attachment_url')
    .order('created_at', { ascending: false })

  const employees = (profiles ?? []) as Profile[]
  const allPosts = (posts ?? []) as Post[]

  const totalPosts = allPosts.length
  const totalInProgress = allPosts.filter((p) => p.status === 'в процес').length
  const totalForReview = allPosts.filter((p) => p.status === 'за проверка').length
  const totalDone = allPosts.filter((p) => p.status === 'готово').length
  const totalReviewed = allPosts.filter((p) => p.reviewed).length

  const visibleEmployees = employees.filter((employee) => {
    if (selectedEmployee !== 'all' && employee.id !== selectedEmployee) return false

    const employeePosts = allPosts.filter((post) => {
      const sameEmployee = post.employee_id === employee.id
      const sameStatus =
        selectedStatus === 'all' ? true : post.status === selectedStatus
      return sameEmployee && sameStatus
    })

    return employeePosts.length > 0 || selectedEmployee === employee.id
  })

  return (
    <main className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Преглед, филтриране и управление на постовете на целия екип."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Общо постове" value={totalPosts} />
        <StatCard label="В процес" value={totalInProgress} tone="soft" />
        <StatCard label="За проверка" value={totalForReview} />
        <StatCard label="Готови" value={totalDone} />
        <StatCard label="Проверени" value={totalReviewed} tone="gold" />
      </div>

      <form className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm" method="get">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <select
            name="employee"
            defaultValue={selectedEmployee}
            className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
          >
            <option value="all">Всички служители</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name ?? 'Без име'}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
          >
            <option value="all">Всички статуси</option>
            <option value="в процес">В процес</option>
            <option value="за проверка">За проверка</option>
            <option value="готово">Готово</option>
          </select>

          <button
            type="submit"
            className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
          >
            Филтрирай
          </button>
        </div>
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
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <div className="mb-5">
                <h2 className="text-3xl font-black tracking-tight text-[#1f1a14]">
                  {employee.full_name ?? 'Без име'}
                </h2>
                <p className="mt-2 text-sm text-[#7b746b]">Роля: {employee.role}</p>
              </div>

              <div className="space-y-5">
                {employeePosts.length ? (
                  employeePosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-[28px] border border-[#ece5d8] bg-[#fcfbf8] p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                            post.status
                          )}`}
                        >
                          {post.status}
                        </span>

                        <p className="text-sm text-[#7b746b]">
                          {new Date(post.created_at).toLocaleString('bg-BG')}
                        </p>
                      </div>

                      <p className="mb-4 whitespace-pre-wrap leading-7 text-[#2d2823]">
                        {post.content}
                      </p>

                      {post.attachment_url && (
                        <a
                          href={post.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-4 inline-block text-sm font-medium text-[#a88414] hover:underline"
                        >
                          Отвори прикачения файл
                        </a>
                      )}

                      {post.reviewed ? (
                        <span className="mb-4 block text-sm font-semibold text-green-700">
                          ✔ Проверено
                        </span>
                      ) : (
                        <div className="mb-4">
                          <span className="mb-2 block text-sm font-semibold text-blue-700">
                            ⏳ Чака проверка
                          </span>

                          <form action={markReviewed}>
                            <input type="hidden" name="postId" value={post.id} />
                            <button
                              type="submit"
                              className="rounded-[16px] bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              Маркирай като проверено
                            </button>
                          </form>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <form action={changePostStatus} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="postId" value={post.id} />

                          <select
                            name="status"
                            defaultValue={post.status}
                            className="rounded-[16px] border border-[#ece5d8] bg-white px-3 py-2 text-sm"
                          >
                            <option value="в процес">В процес</option>
                            <option value="за проверка">За проверка</option>
                            <option value="готово">Готово</option>
                          </select>

                          <button
                            type="submit"
                            className="rounded-[16px] bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a88414]"
                          >
                            Смени статус
                          </button>
                        </form>

                        <form action={deletePostFromDashboard}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Изтрий пост
                          </button>
                        </form>
                      </div>

                      <PostComments postId={post.id} />
                    </div>
                  ))
                ) : (
                  <p className="text-[#7b746b]">Няма постове по тези филтри.</p>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Няма намерени резултати.</p>
        </div>
      )}
    </main>
  )
}