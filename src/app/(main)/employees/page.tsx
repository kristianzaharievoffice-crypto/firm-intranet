export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import { uiText } from '@/lib/ui-text'

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
        title={uiText.employees.title}
        subtitle={uiText.employees.subtitle}
      />

      {items.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="rounded-[36px] border border-[#ece5d8] bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-3xl font-black text-[#a88414]">
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

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-tight text-[#1f1a14]">
                    {employee.full_name ?? uiText.employees.noName}
                  </h2>

                  <p className="mt-2 text-base text-[#7b746b]">
                    {employee.job_title || uiText.employees.noJobTitle}
                  </p>

                  <p className="mt-1 text-sm text-[#a09a90]">
                    {employee.department || uiText.employees.noDepartment}
                  </p>

                  <p className="mt-3 inline-flex rounded-full bg-[#fbf3dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a88414]">
                    {employee.role}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">{uiText.employees.noEmployees}</p>
        </div>
      )}
    </main>
  )
}