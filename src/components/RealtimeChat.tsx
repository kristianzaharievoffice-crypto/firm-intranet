'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
}

interface SenderMap {
  [key: string]: string
}

export default function RealtimeChat({
  initialMessages,
  currentUserId,
  chatId,
  senderNames,
}: {
  initialMessages: Message[]
  currentUserId: string
  chatId: string
  senderNames: SenderMap
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">Все още няма съобщения.</p>
      </div>
    )
  }

  return (
    <div className="modern-scroll max-h-[60vh] overflow-y-auto rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
      <div className="space-y-4">
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId
          const senderName = senderNames[message.sender_id] ?? 'Потребител'

          return (
            <div
              key={message.id}
              className={`max-w-2xl rounded-[28px] p-4 ${
                isMine
                  ? 'ml-auto bg-gradient-to-br from-[#d1ac35] to-[#a88414] text-white'
                  : 'bg-[#f8f4eb] text-[#1f1a14]'
              }`}
            >
              <p className={`mb-2 text-xs font-semibold ${isMine ? 'text-white/80' : 'text-[#7b746b]'}`}>
                {isMine ? 'Ти' : senderName}
              </p>

              {message.content && (
                <p className="whitespace-pre-wrap leading-7">{message.content}</p>
              )}

              {message.attachment_url && (
                <a
                  href={message.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-3 block text-sm underline ${
                    isMine ? 'text-white' : 'text-[#a88414]'
                  }`}
                >
                  Отвори прикачения файл
                </a>
              )}

              <p className={`mt-3 text-xs ${isMine ? 'text-white/80' : 'text-[#7b746b]'}`}>
                {new Date(message.created_at).toLocaleString('bg-BG')}
              </p>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}