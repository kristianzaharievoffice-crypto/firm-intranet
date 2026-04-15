export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import { uiText } from '@/lib/ui-text'

export default async function EmployeeDetailsPage({
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

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, full_name, role, job_title, department, phone, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!employee) redirect('/employees')

  return (
    <main className="space-y-8">
      <PageHeader
        title={employee.full_name ?? uiText.employees.noName}
        subtitle={uiText.employees.profileTitle}
        action={
          <Link
            href="/employees"
            className="rounded-[20px] border border-[#e5d6ae] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
          >
            {uiText.common.back}
          </Link>
        }
      />

      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-4xl font-black text-[#a88414]">
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

          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[#1f1a14]">
                {employee.full_name ?? uiText.employees.noName}
              </h2>
              <p className="mt-2 text-[#7b746b]">{employee.role}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="text-sm font-semibold text-[#1f1a14]">
                  {uiText.admin.jobTitle}
                </p>
                <p className="mt-1 text-[#7b746b]">
                  {employee.job_title || uiText.employees.noJobTitle}
                </p>
              </div>

              <div className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="text-sm font-semibold text-[#1f1a14]">
                  {uiText.admin.department}
                </p>
                <p className="mt-1 text-[#7b746b]">
                  {employee.department || uiText.employees.noDepartment}
                </p>
              </div>

              <div className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="text-sm font-semibold text-[#1f1a14]">
                  {uiText.employees.contact}
                </p>
                <p className="mt-1 text-[#7b746b]">{employee.phone || '-'}</p>
              </div>

              <div className="rounded-[20px] bg-[#fcfbf8] p-4">
                <p className="text-sm font-semibold text-[#1f1a14]">
                  {uiText.admin.role}
                </p>
                <p className="mt-1 text-[#7b746b]">{employee.role}</p>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#fcfbf8] p-4">
              <p className="text-sm font-semibold text-[#1f1a14]">
                {uiText.employees.about}
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-[#7b746b]">
                {employee.bio || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}