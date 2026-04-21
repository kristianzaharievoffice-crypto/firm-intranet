'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserItem {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  existing_chat_id: string | null
  unread_count: number
  last_message: string
  last_message_at: string | null
}

export default function ChatDirectory({ users }: { users: UserItem[] }) {
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

  const formatTime = (value: string | null) => {
    if (!value) return ''

    const date = new Date(value)
    const now = new Date()

    if (date.toDateString() === now.toDateString()) {
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

  return (
    <div className="rounded-[30px] border border-[#ece5d8] bg-white shadow-sm">
      <div className="divide-y divide-[#f1e9da]">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => void openChat(user.id, user.existing_chat_id)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#faf6ee]"
          >
            {/* Avatar */}
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-lg font-bold text-[#a88414]">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.full_name[0]
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-semibold text-[#1f1a14]">
                  {user.full_name}
                </p>

                <div className="flex items-center gap-2">
                  {user.last_message_at && (
                    <span className="text-xs text-[#9b948a]">
                      {formatTime(user.last_message_at)}
                    </span>
                  )}

                  {user.unread_count > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#c9a227] px-2 text-xs font-bold text-white">
                      {user.unread_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Last message */}
              <p className="truncate text-sm text-[#7b746b]">
                {user.last_message}
              </p>
            </div>

            {/* Action */}
            <div className="text-sm font-semibold text-[#a88414]">
              {loadingId === user.id ? '...' : 'Open'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}