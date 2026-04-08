export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'

interface Employee {
  id: string
  full_name: string | null
  role: string
  job_title: string | null
  department: string | null
  avatar_url: string | null
}

export default async function EmployeesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, avatar_url')
    .order('full_name', { ascending: true })

  const items = (employees ?? []) as Employee[]

  return (
    <main className="space-y-8">
      <PageHeader
        title="Служители"
        subtitle="Хората в системата, техните роли и основна информация."
      />

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-xl font-black text-[#a88414]">
                  {employee.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.avatar_url}
                      alt={employee.full_name ?? 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (employee.full_name?.[0] ?? 'U').toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
                    {employee.full_name ?? 'Без име'}
                  </h2>
                  <p className="mt-1 text-sm text-[#7b746b]">
                    {employee.job_title || 'Без длъжност'}
                  </p>
                  <p className="text-sm text-[#a09a90]">
                    {employee.department || 'Без отдел'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Няма добавени служители.</p>
        </div>
      )}
    </main>
  )
}