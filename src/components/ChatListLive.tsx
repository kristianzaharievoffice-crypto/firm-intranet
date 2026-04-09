'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChatItem {
  id: string
  employee_name: string
  unread_count: number
  last_message_text: string
  last_message_time: string | null
}

interface MessageRow {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatReadRow {
  chat_id: string
  last_read_at: string
}

export default function ChatListLive({
  initialChats,
  currentUserId,
  chatIds,
}: {
  initialChats: ChatItem[]
  currentUserId: string
  chatIds: string[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [chats, setChats] = useState<ChatItem[]>(initialChats)

  useEffect(() => {
    setChats(initialChats)
  }, [initialChats])

  useEffect(() => {
    const messageChannel = supabase
      .channel(`chat-list-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as MessageRow

          if (!chatIds.includes(newMessage.chat_id)) return

          setChats((current) =>
            current.map((chat) => {
              if (chat.id !== newMessage.chat_id) return chat

              const isMine = newMessage.sender_id === currentUserId
              const unreadCount = isMine ? chat.unread_count : chat.unread_count + 1

              return {
                ...chat,
                unread_count: unreadCount,
                last_message_text: newMessage.content || 'Прикачен файл',
                last_message_time: newMessage.created_at,
              }
            })
          )
        }
      )
      .subscribe()

    const readChannel = supabase
      .channel(`chat-list-reads-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as ChatReadRow | null
          if (!row?.chat_id) return

          setChats((current) =>
            current.map((chat) =>
              chat.id === row.chat_id
                ? {
                    ...chat,
                    unread_count: 0,
                  }
                : chat
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(readChannel)
    }
  }, [currentUserId, supabase, chatIds])

  if (!chats.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">Няма налични чатове.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[32px] border border-[#ece5d8] bg-white p-4 shadow-sm">
      <div className="space-y-3">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className="block rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-5 transition hover:bg-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-[#1f1a14]">
                  {chat.employee_name}
                </p>

                <p className="mt-1 truncate text-sm text-[#7b746b]">
                  {chat.last_message_text || 'Още няма съобщения'}
                </p>

                {chat.last_message_time && (
                  <p className="mt-2 text-xs text-[#a09a90]">
                    {new Date(chat.last_message_time).toLocaleString('bg-BG')}
                  </p>
                )}
              </div>

              {chat.unread_count > 0 && (
                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#c9a227] px-3 py-2 text-sm font-semibold text-white">
                  {chat.unread_count}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}