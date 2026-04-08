export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'

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

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, phone, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!employee) redirect('/employees')

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
    <main className="space-y-8">
      <PageHeader
        title={item.full_name ?? 'Без име'}
        subtitle="Публичен профил на служител в системата."
      />

      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-4xl font-black text-[#a88414]">
            {item.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.avatar_url}
                alt={item.full_name ?? 'Avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              (item.full_name?.[0] ?? 'U').toUpperCase()
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-black tracking-tight text-[#1f1a14]">
              {item.full_name ?? 'Без име'}
            </h2>
            <p className="mt-2 text-[#7b746b]">
              {item.job_title || 'Без длъжност'} • {item.department || 'Без отдел'}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a09a90]">Роля</p>
                <p className="mt-2 font-semibold text-[#1f1a14]">{item.role}</p>
              </div>

              <div className="rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a09a90]">Телефон</p>
                <p className="mt-2 font-semibold text-[#1f1a14]">{item.phone || 'Няма'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a09a90]">Описание</p>
              <p className="mt-2 leading-7 text-[#433b32]">{item.bio || 'Няма описание'}</p>
            </div>
          </div>
        </div>
      </div>

      {(me.role === 'admin' || me.id === item.id) && (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-black tracking-tight text-[#1f1a14]">
            Постове
          </h2>

          {posts.length ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-[28px] border border-[#ece5d8] bg-[#fcfbf8] p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-[#fbf3dc] px-3 py-1 text-sm font-semibold text-[#a88414]">
                      {post.status}
                    </span>

                    <p className="text-sm text-[#7b746b]">
                      {new Date(post.created_at).toLocaleString('bg-BG')}
                    </p>
                  </div>

                  <p className="whitespace-pre-wrap leading-7 text-[#2d2823]">
                    {post.content}
                  </p>

                  <p className="mt-3 text-sm font-semibold">
                    {post.reviewed ? '✔ Проверено' : '⏳ Чака проверка'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#7b746b]">Няма постове.</p>
          )}
        </div>
      )}
    </main>
  )
}