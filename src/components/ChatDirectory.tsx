'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserItem {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
  existing_chat_id: string | null
  unread_count: number
}

type ChatDirectoryProps = {
  users: UserItem[]
}

export default function ChatDirectory({ users }: ChatDirectoryProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const openChat = async (userId: string, existingChatId: string | null) => {
    if (existingChatId) {
      router.push(`/chat/${existingChatId}`)
      return
    }

    setLoadingId(userId)

    const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
      other_user_id: userId,
    })

    if (error || !data) {
      setLoadingId(null)
      return
    }

    router.push(`/chat/${data}`)
  }

  if (!users.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No users found.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-2xl font-black text-[#a88414]">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (user.full_name?.[0] ?? 'U').toUpperCase()
              )}

              {user.unread_count > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#c9a227] px-2 text-xs font-bold text-white shadow">
                  {user.unread_count}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-black tracking-tight text-[#1f1a14]">
                {user.full_name}
              </h2>
              <p className="mt-1 text-sm text-[#7b746b]">
                {user.job_title || 'No job title'}
              </p>
              <p className="mt-1 text-sm text-[#a09a90]">
                {user.department || 'No department'}
              </p>

              {user.unread_count > 0 && (
                <p className="mt-2 text-sm font-semibold text-[#a88414]">
                  {user.unread_count} unread message
                  {user.unread_count === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void openChat(user.id, user.existing_chat_id)}
            disabled={loadingId === user.id}
            className="mt-5 rounded-[18px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
          >
            {loadingId === user.id ? 'Opening...' : 'Open chat'}
          </button>
        </div>
      ))}
    </div>
  )
}