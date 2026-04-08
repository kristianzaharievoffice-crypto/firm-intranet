export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  if (!user) {
    redirect('/login')
  }

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, avatar_url')
    .order('full_name', { ascending: true })

  const items = (employees ?? []) as Employee[]

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Служители</h1>
        <p className="text-gray-500 mt-2">
          Списък с хората в системата
        </p>
      </div>

      {items.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-lg overflow-hidden">
                  {employee.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.avatar_url}
                      alt={employee.full_name ?? 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (employee.full_name?.[0] ?? 'U').toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#1f2937]">
                    {employee.full_name ?? 'Без име'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {employee.job_title || 'Без длъжност'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {employee.department || 'Без отдел'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500">Няма добавени служители.</p>
        </div>
      )}
    </main>
  )
}