export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'

interface ProfileRow {
  id: string
  full_name: string | null
  role: string
  job_title: string | null
  department: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
}

async function updateProfileAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id') || '')
  const full_name = String(formData.get('full_name') || '')
  const role = String(formData.get('role') || 'employee')
  const job_title = String(formData.get('job_title') || '')
  const department = String(formData.get('department') || '')
  const phone = String(formData.get('phone') || '')
  const bio = String(formData.get('bio') || '')
  const avatar_url = String(formData.get('avatar_url') || '')

  const supabase = await createClient()

  await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim() || null,
      role,
      job_title: job_title.trim() || null,
      department: department.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatar_url.trim() || null,
    })
    .eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/employees')
}

export default async function AdminPage() {
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

  if (!me || me.role !== 'admin') redirect('/wall')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, phone, bio, avatar_url')
    .order('full_name', { ascending: true })

  const { count: postsCount } = await supabase
    .from('wall_posts')
    .select('*', { count: 'exact', head: true })

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  const { count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })

  const { count: chatsCount } = await supabase
    .from('chats')
    .select('*', { count: 'exact', head: true })

  const users = (profiles ?? []) as ProfileRow[]

  return (
    <main className="space-y-8">
      <PageHeader
        title="Admin Panel"
        subtitle="Управление на потребители, роли и фирмени данни. Тук админът редактира съществуващите профили и има бърз достъп до основните функции."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tasks/new"
              className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
            >
              Нова задача
            </Link>
            <Link
              href="/events/new"
              className="rounded-[20px] border border-[#e5d6ae] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
            >
              Ново събитие
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Потребители" value={users.length} />
        <StatCard label="Постове" value={postsCount ?? 0} />
        <StatCard label="Задачи" value={tasksCount ?? 0} tone="soft" />
        <StatCard label="Събития / Чатове" value={`${eventsCount ?? 0} / ${chatsCount ?? 0}`} tone="gold" />
      </div>

      <div className="space-y-5">
        {users.map((profile) => (
          <form
            key={profile.id}
            action={updateProfileAction}
            className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="id" value={profile.id} />

            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-2xl font-black text-[#a88414]">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? 'Avatar'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.full_name?.[0] ?? 'U').toUpperCase()
                )}
              </div>

              <div>
                <p className="text-2xl font-black tracking-tight text-[#1f1a14]">
                  {profile.full_name ?? 'Без име'}
                </p>
                <p className="mt-1 text-sm text-[#7b746b]">ID: {profile.id}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="full_name"
                defaultValue={profile.full_name ?? ''}
                placeholder="Име"
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              />

              <select
                name="role"
                defaultValue={profile.role}
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              >
                <option value="employee">employee</option>
                <option value="admin">admin</option>
              </select>

              <input
                name="job_title"
                defaultValue={profile.job_title ?? ''}
                placeholder="Длъжност"
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              />

              <input
                name="department"
                defaultValue={profile.department ?? ''}
                placeholder="Отдел"
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              />

              <input
                name="phone"
                defaultValue={profile.phone ?? ''}
                placeholder="Телефон"
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              />

              <input
                name="avatar_url"
                defaultValue={profile.avatar_url ?? ''}
                placeholder="Avatar URL"
                className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
              />
            </div>

            <textarea
              name="bio"
              defaultValue={profile.bio ?? ''}
              placeholder="Описание"
              className="mt-4 min-h-28 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none"
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
              >
                Запази промените
              </button>

              <Link
                href={`/employees/${profile.id}`}
                className="rounded-[20px] border border-[#e5d6ae] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
              >
                Отвори профила
              </Link>
            </div>
          </form>
        ))}
      </div>
    </main>
  )
}