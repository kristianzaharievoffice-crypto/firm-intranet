'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface UserItem {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  role: string
  office: string
}

export default function EmployeesList({
  users,
  isAdmin = false,
}: {
  users: UserItem[]
  isAdmin?: boolean
}) {
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const changeOffice = async (userId: string, office: string) => {
    setLoadingId(userId)

    await supabase.from('profiles').update({ office }).eq('id', userId)

    setLoadingId(null)
    window.location.reload()
  }

  if (!users.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No employees found.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="rounded-[34px] border border-[#ece5d8] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <Link href={`/employees/${user.id}`} className="block">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-3xl font-black text-[#a88414]">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || 'User'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (user.full_name?.[0] ?? 'U').toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-black text-[#1f1a14]">
                  {user.full_name || 'User'}
                </h2>

                <p className="mt-1 text-sm text-[#7b746b]">
                  {user.job_title || 'No job title'}
                </p>

                <p className="mt-1 text-sm text-[#a09a90]">
                  {user.department || 'No department'}
                </p>

                <p className="mt-2 text-xs font-semibold text-[#c9a227]">
                  {user.office === 'dubai'
                    ? '🇦🇪 Office Dubai'
                    : '🇧🇬 Office Sofia'}
                </p>
              </div>
            </div>
          </Link>

          {isAdmin && (
            <div className="mt-5">
              <label className="text-xs font-semibold text-[#7b746b]">
                Change office
              </label>

              <select
                defaultValue={user.office}
                disabled={loadingId === user.id}
                onChange={(e) => void changeOffice(user.id, e.target.value)}
                className="mt-2 w-full rounded-[16px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm outline-none focus:border-[#c9a227]"
              >
                <option value="sofia">Office Sofia</option>
                <option value="dubai">Office Dubai</option>
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}