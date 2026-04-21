'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string | null
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
  reply_to_message_id?: string | null
}

interface SenderMap {
  [key: string]: string
}

interface AvatarMap {
  [key: string]: string | null
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatRoomLive({
  initialMessages,
  currentUserId,
  chatId,
  senderNames,
  senderAvatars,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  otherUserJobTitle,
}: {
  initialMessages: Message[]
  currentUserId: string
  chatId: string
  senderNames: SenderMap
  senderAvatars: AvatarMap
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string | null
  otherUserJobTitle: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [typing, setTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [messageError, setMessageError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingClearRef = useRef<NodeJS.Timeout | null>(null)
  const uiChannelRef = useRef<any>(null)
  const shouldStickBottomRef = useRef(true)
  const markingReadRef = useRef(false)

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(
        'id, content, created_at, sender_id, chat_id, attachment_url, reply_to_message_id'
      )
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    setMessages((data ?? []) as Message[])
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const markReadNow = async () => {
    if (markingReadRef.current) return
    markingReadRef.current = true

    try {
      await supabase.rpc('mark_chat_read', {
        target_chat_id: chatId,
      })
    } finally {
      markingReadRef.current = false
    }
  }

  const updateOwnPresence = async (currentChat: string | null) => {
    await supabase.from('user_presence').upsert(
      {
        user_id: currentUserId,
        last_seen_at: new Date().toISOString(),
        current_chat_id: currentChat,
      },
      { onConflict: 'user_id' }
    )
  }

  const loadOtherState = async () => {
    const { data: presence } = await supabase
      .from('user_presence')
      .select('last_seen_at')
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
    setMessages(initialMessages)
    setTimeout(() => scrollToBottom('auto'), 40)
  }, [initialMessages])

  useEffect(() => {
    void markReadNow()
    void updateOwnPresence(chatId)
    void loadOtherState()

    const heartbeat = setInterval(() => {
      void updateOwnPresence(chatId)
    }, 10000)

    const otherStatePoll = setInterval(() => {
      void loadOtherState()
    }, 3000)

    return () => {
      clearInterval(heartbeat)
      clearInterval(otherStatePoll)
      void updateOwnPresence(null)
    }
  }, [chatId, currentUserId, otherUserId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      shouldStickBottomRef.current = distance < 120
    }

    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
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
        async () => {
          await loadMessages()
          await markReadNow()

          if (shouldStickBottomRef.current) {
            setTimeout(() => scrollToBottom('smooth'), 60)
          }
        }
      )
      .subscribe()

    const presenceChannel = supabase
      .channel(`chat-room-presence-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        async () => {
          await loadOtherState()
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
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(uiChannel)
    }
  }, [chatId, otherUserId])

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

    const { error } = await supabase.rpc('send_message_v2', {
      target_chat_id: chatId,
      message_content: trimmedContent || 'Attached file',
      message_attachment_url: attachmentUrl,
      reply_to: replyTo?.id ?? null,
    })

    if (error) {
      setMessageError(error.message)
      setIsSending(false)
      return
    }

    setContent('')
    setFile(null)
    setReplyTo(null)
    setIsSending(false)
    await broadcastTyping(false)
    await updateOwnPresence(chatId)
    await loadMessages()

    shouldStickBottomRef.current = true
    setTimeout(() => scrollToBottom('smooth'), 60)
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

  const replyPreviewText = replyTo?.content?.trim()
    ? replyTo.content
    : replyTo?.attachment_url
    ? 'Attached file'
    : ''

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 shrink-0 rounded-[22px] border border-[#ece5d8] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-base font-black text-[#a88414]">
              {otherUserAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={otherUserAvatar}
                  alt={otherUserName}
                  className="h-full w-full object-cover"
                />
              ) : (
                (otherUserName?.[0] ?? 'U').toUpperCase()
              )}
            </div>

            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white shadow ${
                otherOnline ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black tracking-tight text-[#1f1a14]">
              {otherUserName}
            </p>
            <p className="mt-0.5 text-xs text-[#7b746b]">
              {otherUserJobTitle || 'Team member'}
            </p>
            <p
              className={`mt-0.5 text-xs font-semibold ${
                typing
                  ? 'text-[#a88414]'
                  : otherOnline
                  ? 'text-emerald-600'
                  : 'text-[#9b948a]'
              }`}
            >
              {typing ? `${otherUserName} is typing...` : otherOnline ? 'Online now' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="modern-scroll min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-[#ece5d8] bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      >
        <div className="space-y-4">
          {messages.map((message) => {
            const isMine = message.sender_id === currentUserId
            const senderName = senderNames[message.sender_id] ?? 'User'
            const senderAvatar = senderAvatars[message.sender_id] ?? null
            const repliedMessage = message.reply_to_message_id
              ? messages.find((m) => m.id === message.reply_to_message_id)
              : null

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[94%] items-end gap-2 sm:max-w-[76%] ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="relative h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-[11px] font-black text-[#a88414] sm:h-9 sm:w-9 sm:text-xs">
                      {senderAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (senderName?.[0] ?? 'U').toUpperCase()
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`rounded-[20px] px-4 py-3 shadow-sm ${
                        isMine
                          ? 'bg-gradient-to-br from-[#d1ac35] to-[#a88414] text-white'
                          : 'border border-[#efe6d4] bg-[#f8f4eb] text-[#1f1a14]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p
                          className={`text-[11px] font-semibold ${
                            isMine ? 'text-white/80' : 'text-[#7b746b]'
                          }`}
                        >
                          {isMine ? 'You' : senderName}
                        </p>

                        <button
                          type="button"
                          onClick={() => setReplyTo(message)}
                          className={`text-[11px] font-semibold ${
                            isMine ? 'text-white/80' : 'text-[#a88414]'
                          }`}
                        >
                          Reply
                        </button>
                      </div>

                      {repliedMessage && (
                        <div
                          className={`mb-3 rounded-[12px] px-3 py-2 text-xs ${
                            isMine ? 'bg-white/15 text-white/85' : 'bg-white text-[#7b746b]'
                          }`}
                        >
                          {senderNames[repliedMessage.sender_id] ?? 'User'}:{' '}
                          {repliedMessage.content?.trim() ||
                            (repliedMessage.attachment_url ? 'Attached file' : 'Message')}
                        </div>
                      )}

                      {message.content && (
                        <p className="whitespace-pre-wrap break-words leading-6">
                          {message.content}
                        </p>
                      )}

                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-3 block text-sm font-semibold underline ${
                            isMine ? 'text-white' : 'text-[#a88414]'
                          }`}
                        >
                          Open attached file
                        </a>
                      )}

                      <p
                        className={`mt-2 text-[11px] ${
                          isMine ? 'text-white/80' : 'text-[#7b746b]'
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-1 flex shrink-0 justify-end px-1">
        {lastOwnMessage && (
          <p className="text-xs text-[#7b746b]">
            {isLastOwnMessageSeen ? 'Seen' : 'Sent'}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-2 shrink-0 rounded-[24px] border border-[#ece5d8] bg-white p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight text-[#1f1a14]">
            New message
          </h2>

          {typing && (
            <span className="text-xs font-medium text-[#a88414] sm:text-sm">
              {otherUserName} is typing...
            </span>
          )}
        </div>

        {replyTo && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-[16px] border border-[#eadfbe] bg-[#fcfbf8] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#a88414]">
                Replying to {senderNames[replyTo.sender_id] ?? 'User'}
              </p>
              <p className="mt-1 truncate text-sm text-[#5d554c]">
                {replyPreviewText}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-sm font-semibold text-[#7b746b]"
            >
              Remove
            </button>
          </div>
        )}

        <div className="grid gap-3">
          <textarea
            value={content}
            onChange={(e) => {
              void handleTyping(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message... (Enter = send, Shift+Enter = new line)"
            className="min-h-20 w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-[18px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60 sm:w-auto"
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