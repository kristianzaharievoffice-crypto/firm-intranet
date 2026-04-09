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

export default function ChatRoomLive({
  initialMessages,
  currentUserId,
  chatId,
  senderNames,
  otherUserId,
  otherUserName,
}: {
  initialMessages: Message[]
  currentUserId: string
  chatId: string
  senderNames: SenderMap
  otherUserId: string
  otherUserName: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [typing, setTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [messageError, setMessageError] = useState('')
  const [isSending, setIsSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    const loadOtherReadState = async () => {
      const { data } = await supabase
        .from('chat_reads')
        .select('last_read_at')
        .eq('chat_id', chatId)
        .eq('user_id', otherUserId)
        .maybeSingle()

      setOtherLastReadAt(data?.last_read_at ?? null)
    }

    loadOtherReadState()
  }, [chatId, otherUserId, supabase])

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, typing, isNearBottom])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const threshold = 120
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight

      setIsNearBottom(distanceFromBottom < threshold)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const messagesChannel = supabase
      .channel(`chat-room-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message

          setMessages((current) => {
            const exists = current.some((m) => m.id === newMessage.id)
            if (exists) return current
            return [...current, newMessage]
          })

          if (newMessage.sender_id !== currentUserId) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)

            await supabase.rpc('mark_chat_read', {
              target_chat_id: chatId,
            })
          }
        }
      )
      .subscribe()

    const readsChannel = supabase
      .channel(`chat-room-reads-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reads',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string } | null
          if (!row?.user_id || !row.last_read_at) return

          if (row.user_id === otherUserId) {
            setOtherLastReadAt(row.last_read_at)
          }
        }
      )
      .subscribe()

    const uiChannel = supabase.channel(`chat-room-ui-${chatId}`)

    uiChannel
      .on('presence', { event: 'sync' }, () => {
        const state = uiChannel.presenceState()
        const online = Object.keys(state).includes(otherUserId)
        setOtherOnline(online)
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId === otherUserId) {
          setTyping(Boolean(payload.payload?.isTyping))
        }
      })

    uiChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await uiChannel.track({
          userId: currentUserId,
          onlineAt: new Date().toISOString(),
        })
      }
    })

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(readsChannel)
      supabase.removeChannel(uiChannel)
    }
  }, [chatId, currentUserId, otherUserId, supabase])

  const lastOwnMessage = [...messages].reverse().find((m) => m.sender_id === currentUserId)

  const isLastOwnMessageSeen =
    !!lastOwnMessage &&
    !!otherLastReadAt &&
    new Date(otherLastReadAt).getTime() >=
      new Date(lastOwnMessage.created_at).getTime()

  const broadcastTyping = async (isTyping: boolean) => {
    const channel = supabase.channel(`chat-room-ui-${chatId}`)
    await channel.subscribe()
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        isTyping,
      },
    })
  }

  const handleTyping = async (value: string) => {
    setContent(value)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    await broadcastTyping(true)

    typingTimeoutRef.current = setTimeout(async () => {
      await broadcastTyping(false)
    }, 1200)
  }

  const send = async () => {
    setMessageError('')

    const trimmedContent = content.trim()

    if (!trimmedContent && !file) {
      setMessageError('Напиши съобщение или избери файл.')
      return
    }

    setIsSending(true)

    let attachmentUrl: string | null = null

    if (file) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessageError('Няма активен потребител.')
        setIsSending(false)
        return
      }

      const originalName = file.name || 'file'
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        setMessageError(`Upload error: ${uploadError.message}`)
        setIsSending(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(uploadData.path)

      attachmentUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.rpc('send_message', {
      target_chat_id: chatId,
      message_content: trimmedContent || (attachmentUrl ? 'Прикачен файл' : ''),
      message_attachment_url: attachmentUrl,
    })

    if (error) {
      setMessageError(error.message)
      setIsSending(false)
      return
    }

    setContent('')
    setFile(null)
    setIsSending(false)
    await broadcastTyping(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await send()
  }

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isSending) {
        await send()
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-[#ece5d8] bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-[#1f1a14]">{otherUserName}</p>
            <p className="mt-1 text-sm text-[#7b746b]">
              {otherOnline ? 'Онлайн' : 'Офлайн'}
            </p>
          </div>

          {typing && (
            <div className="rounded-full bg-[#fbf3dc] px-4 py-2 text-sm font-medium text-[#a88414]">
              {otherUserName} пише...
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="modern-scroll max-h-[62vh] overflow-y-auto rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
      >
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
                <p
                  className={`mb-2 text-xs font-semibold ${
                    isMine ? 'text-white/80' : 'text-[#7b746b]'
                  }`}
                >
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

                <p
                  className={`mt-3 text-xs ${
                    isMine ? 'text-white/80' : 'text-[#7b746b]'
                  }`}
                >
                  {new Date(message.created_at).toLocaleString('bg-BG')}
                </p>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex justify-end">
        {lastOwnMessage && (
          <p className="text-sm text-[#7b746b]">
            {isLastOwnMessageSeen ? 'Прочетено' : 'Изпратено'}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-2xl font-black tracking-tight text-[#1f1a14]">
          Ново съобщение
        </h2>

        <div className="grid gap-4">
          <textarea
            value={content}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напиши съобщение... (Enter = изпращане, Shift+Enter = нов ред)"
            className="min-h-28 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
          />
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="submit"
            disabled={isSending}
            className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
          >
            {isSending ? 'Изпращане...' : 'Изпрати'}
          </button>

          {messageError && (
            <p className="text-sm text-[#7b746b]">{messageError}</p>
          )}
        </div>
      </form>
    </div>
  )
}