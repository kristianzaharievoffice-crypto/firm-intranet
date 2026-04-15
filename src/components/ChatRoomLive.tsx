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
  const typingClearRef = useRef<NodeJS.Timeout | null>(null)
  const uiChannelRef = useRef<any>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

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
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, typing, isNearBottom])

  const markReadNow = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId)

    await supabase.rpc('mark_chat_read', {
      target_chat_id: chatId,
    })
  }

  const updateOwnPresence = async () => {
    await supabase.from('user_presence').upsert(
      {
        user_id: currentUserId,
        last_seen_at: new Date().toISOString(),
        current_chat_id: chatId,
      },
      { onConflict: 'user_id' }
    )
  }

  const loadOtherState = async () => {
    const { data: presence } = await supabase
      .from('user_presence')
      .select('last_seen_at, current_chat_id')
      .eq('user_id', otherUserId)
      .maybeSingle()

    if (presence?.last_seen_at) {
      const lastSeen = new Date(presence.last_seen_at).getTime()
      const now = Date.now()
      const diffSeconds = (now - lastSeen) / 1000
      setOtherOnline(diffSeconds < 35)
    } else {
      setOtherOnline(false)
    }

    const { data: readRow } = await supabase
      .from('chat_reads')
      .select('last_read_at')
      .eq('chat_id', chatId)
      .eq('user_id', otherUserId)
      .maybeSingle()

    setOtherLastReadAt(readRow?.last_read_at ?? null)
  }

  useEffect(() => {
    void markReadNow()
    void updateOwnPresence()
    void loadOtherState()

    const heartbeat = setInterval(() => {
      void updateOwnPresence()
      void markReadNow()
    }, 10000)

    const otherStatePoll = setInterval(() => {
      void loadOtherState()
    }, 3000)

    return () => {
      clearInterval(heartbeat)
      clearInterval(otherStatePoll)

      void supabase.from('user_presence').upsert(
        {
          user_id: currentUserId,
          last_seen_at: new Date().toISOString(),
          current_chat_id: null,
        },
        { onConflict: 'user_id' }
      )
    }
  }, [chatId, currentUserId, otherUserId, supabase])

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
            await markReadNow()
          }
        }
      )
      .subscribe()

    const uiChannel = supabase.channel(`chat-ui-${chatId}`)
    uiChannelRef.current = uiChannel

    uiChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId === otherUserId) {
          setTyping(Boolean(payload.payload?.isTyping))

          if (typingClearRef.current) {
            clearTimeout(typingClearRef.current)
          }

          typingClearRef.current = setTimeout(() => {
            setTyping(false)
          }, 1600)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(uiChannel)
    }
  }, [chatId, currentUserId, otherUserId, supabase])

  const lastOwnMessage = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId)

  const isLastOwnMessageSeen =
    !!lastOwnMessage &&
    !!otherLastReadAt &&
    new Date(otherLastReadAt).getTime() >=
      new Date(lastOwnMessage.created_at).getTime()

  const broadcastTyping = async (isTyping: boolean) => {
    if (!uiChannelRef.current) return

    await uiChannelRef.current.send({
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
      setMessageError('Write a message or choose a file.')
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
        setMessageError('No active user.')
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

    const { data, error } = await supabase.rpc('send_message', {
      target_chat_id: chatId,
      message_content: trimmedContent || (attachmentUrl ? 'Attached file' : ''),
      message_attachment_url: attachmentUrl,
    })

    if (error) {
      setMessageError(error.message)
      setIsSending(false)
      return
    }

    if (data) {
      const inserted = data as Message

      setMessages((current) => {
        const exists = current.some((m) => m.id === inserted.id)
        if (exists) return current
        return [...current, inserted]
      })
    }

    setContent('')
    setFile(null)
    setIsSending(false)
    await broadcastTyping(false)
    await updateOwnPresence()
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
              {otherOnline ? 'Online' : 'Offline'}
            </p>
          </div>

          {typing && (
            <div className="rounded-full bg-[#fbf3dc] px-4 py-2 text-sm font-medium text-[#a88414]">
              {otherUserName} is typing...
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
            const senderName = senderNames[message.sender_id] ?? 'User'

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
                  {isMine ? 'You' : senderName}
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
                    Open attached file
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
            {isLastOwnMessageSeen ? 'Seen' : 'Sent'}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-2xl font-black tracking-tight text-[#1f1a14]">
          New message
        </h2>

        <div className="grid gap-4">
          <textarea
            value={content}
            onChange={(e) => {
              void handleTyping(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message... (Enter = send, Shift+Enter = new line)"
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
            {isSending ? 'Sending...' : 'Send'}
          </button>

          {messageError && (
            <p className="text-sm text-[#7b746b]">{messageError}</p>
          )}
        </div>
      </form>
    </div>
  )
}