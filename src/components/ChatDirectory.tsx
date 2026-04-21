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
  last_message: string
  last_message_at: string | null
  is_online: boolean
}

type ChatDirectoryProps = {
  users: UserItem[]
}

function formatTime(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  if (sameDay) {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
  })
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
    <div className="space-y-4">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => void openChat(user.id, user.existing_chat_id)}
          disabled={loadingId === user.id}
          className="w-full rounded-[30px] border border-[#ece5d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        >
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-xl font-black text-[#a88414]">
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

              <span
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
                  user.is_online ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black tracking-tight text-[#1f1a14]">
                    {user.full_name}
                  </h2>

                  <p className="mt-1 text-sm text-[#7b746b]">
                    {user.job_title || 'No job title'}
                    {user.department ? ` · ${user.department}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {user.last_message_at && (
                    <span className="text-xs font-medium text-[#9b948a]">
                      {formatTime(user.last_message_at)}
                    </span>
                  )}

                  {user.unread_count > 0 && (
                    <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[#c9a227] px-2 text-xs font-bold text-white shadow">
                      {user.unread_count}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 truncate text-sm leading-6 text-[#5d554c]">
                {user.last_message}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-semibold ${
                    user.is_online ? 'text-emerald-600' : 'text-[#9b948a]'
                  }`}
                >
                  {user.is_online ? 'Online' : 'Offline'}
                </span>

                <span className="text-sm font-semibold text-[#a88414]">
                  {loadingId === user.id ? 'Opening...' : 'Open chat'}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}