'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  chat_id: string
}

export default function RealtimeChat({
  initialMessages,
  currentUserId,
  chatId,
}: {
  initialMessages: Message[]
  currentUserId: string
  chatId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    const channel = supabase
      .channel(`chat-room-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message

          setMessages((current) => {
            const exists = current.some((m) => m.id === newMessage.id)
            if (exists) return current
            return [...current, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  if (!messages.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <p className="text-gray-500">Все още няма съобщения.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
      {messages.map((message) => {
        const isMine = message.sender_id === currentUserId

        return (
          <div
            key={message.id}
            className={`p-4 rounded-2xl max-w-xl ${
              isMine ? 'bg-black text-white ml-auto' : 'bg-gray-100 text-black'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <p className={`text-xs mt-2 ${isMine ? 'text-gray-200' : 'text-gray-500'}`}>
              {new Date(message.created_at).toLocaleString('bg-BG')}
            </p>
          </div>
        )
      })}
    </div>
  )
}