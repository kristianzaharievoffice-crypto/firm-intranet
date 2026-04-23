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

interface GroupMember {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
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
  currentUserName,
  chatId,
  chatType,
  senderNames,
  senderAvatars,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  otherUserJobTitle,
  groupName,
  groupMembers,
  headerTitle,
  headerSubtitle,
}: {
  initialMessages: Message[]
  currentUserId: string
  currentUserName: string
  chatId: string
  chatType: 'direct' | 'group'
  senderNames: SenderMap
  senderAvatars: AvatarMap
  otherUserId: string | null
  otherUserName: string
  otherUserAvatar: string | null
  otherUserJobTitle: string | null
  groupName: string | null
  groupMembers: GroupMember[]
  headerTitle: string
  headerSubtitle: string
}) {
  const supabase = useMemo(() => createClient(), [])

  const [messages, setMessages] = useState(initialMessages)
  const [typing, setTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [messageError, setMessageError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uiChannelRef = useRef<any>(null)
  const shouldStickBottomRef = useRef(true)
  const markingReadRef = useRef(false)
  const clearingNotificationsRef = useRef(false)
  const currentChatLink = `/chat/${chatId}`

  const isDirect = chatType === 'direct'

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

  const clearCurrentChatNotifications = async () => {
    if (clearingNotificationsRef.current) return
    clearingNotificationsRef.current = true

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('type', 'chat')
        .eq('link', currentChatLink)
        .eq('is_read', false)
    } finally {
      clearingNotificationsRef.current = false
    }
  }

  const markReadNow = async () => {
    if (markingReadRef.current) return
    markingReadRef.current = true

    try {
      await supabase.rpc('mark_chat_read', {
        target_chat_id: chatId,
      })
      await clearCurrentChatNotifications()
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
    if (!isDirect || !otherUserId) return

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
    void clearCurrentChatNotifications()

    if (isDirect) {
      void loadOtherState()
    }

    const heartbeat = setInterval(() => {
      void updateOwnPresence(chatId)
      void clearCurrentChatNotifications()
    }, 4000)

    const otherStatePoll = isDirect
      ? setInterval(() => {
          void loadOtherState()
        }, 3000)
      : null

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void updateOwnPresence(chatId)
        void markReadNow()
        void clearCurrentChatNotifications()
      }
    }

    const onFocus = () => {
      void updateOwnPresence(chatId)
      void markReadNow()
      void clearCurrentChatNotifications()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(heartbeat)
      if (otherStatePoll) clearInterval(otherStatePoll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      void updateOwnPresence(null)
    }
  }, [chatId, currentUserId, isDirect, otherUserId])

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
          await updateOwnPresence(chatId)
          await clearCurrentChatNotifications()

          if (shouldStickBottomRef.current) {
            setTimeout(() => scrollToBottom('smooth'), 60)
          }
        }
      )
      .subscribe()

    const notificationChannel = supabase
      .channel(`chat-room-notifications-${chatId}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          await clearCurrentChatNotifications()
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
          if (isDirect) {
            await loadOtherState()
          }
        }
      )
      .subscribe()

    const uiChannel = supabase.channel(`chat-ui-${chatId}`)
    uiChannelRef.current = uiChannel

    if (isDirect && otherUserId) {
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
    } else {
      uiChannel.subscribe()
    }

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(notificationChannel)
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(uiChannel)
    }
  }, [chatId, currentUserId, isDirect, otherUserId, supabase])

  const lastOwnMessage = [...messages].reverse().find((m) => m.sender_id === currentUserId)

  const isLastOwnMessageSeen =
    !!lastOwnMessage &&
    !!otherLastReadAt &&
    new Date(otherLastReadAt).getTime() >= new Date(lastOwnMessage.created_at).getTime()

  const broadcastTyping = async (isTypingNow: boolean) => {
    if (!uiChannelRef.current || !isDirect) return

    await uiChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        isTyping: isTypingNow,
      },
    })
  }

  const handleTyping = async (value: string) => {
    setContent(value)
    if (!isDirect) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    await broadcastTyping(true)

    typingTimeoutRef.current = setTimeout(async () => {
      await broadcastTyping(false)
    }, 1200)
  }

  const uploadAttachmentIfAny = async () => {
    if (!file) return null

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('No active user.')
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
      throw new Error(`Upload error: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(uploadData.path)

    return publicUrlData.publicUrl
  }

  const send = async () => {
    setMessageError('')

    const trimmedContent = content.trim()

    if (!trimmedContent && !file) {
      setMessageError('Write a message or choose a file.')
      return
    }


    setIsSending(true)

    try {
      const attachmentUrl = await uploadAttachmentIfAny()

      if (isDirect) {
        const { error } = await supabase.rpc('send_message_v2', {
          target_chat_id: chatId,
          message_content: trimmedContent || 'Attached file',
          message_attachment_url: attachmentUrl,
          reply_to: replyTo?.id ?? null,
        })

        if (error) {
          throw new Error(error.message)
        }
      } else {
        const { error } = await supabase.rpc('send_group_message_v1', {
          target_chat_id: chatId,
          message_content: trimmedContent || 'Attached file',
          message_attachment_url: attachmentUrl,
          reply_to: replyTo?.id ?? null,
        })

        if (error) {
          throw new Error(error.message)
        }
      }

      setContent('')
      setFile(null)
      setReplyTo(null)
      setIsSending(false)

      if (isDirect) {
        await broadcastTyping(false)
      }

      await updateOwnPresence(chatId)
      await loadMessages()
      await clearCurrentChatNotifications()
      shouldStickBottomRef.current = true
      setTimeout(() => scrollToBottom('smooth'), 60)
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Message send failed')
      setIsSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await send()
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
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
    <div className="flex h-[calc(100vh-180px)] min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-[#ece5d8] bg-white shadow-sm">
      <div className="border-b border-[#ece5d8] bg-[#fffdf8] px-5 py-4">
        <div className="flex items-center gap-4">
          {isDirect ? (
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-sm font-semibold text-[#8e7b56]">
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

              <span
                className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  otherOnline ? 'bg-emerald-500' : 'bg-[#c7bda9]'
                }`}
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#f6e7a7] to-[#d4af37] text-lg font-semibold text-[#3a2e0b]">
              👥
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-[#1f1f1f]">
              {headerTitle}
            </div>

            <div className="mt-1 text-sm text-[#7b6f5a]">
              {isDirect
                ? typing
                  ? `${otherUserName} is typing...`
                  : otherOnline
                  ? 'Online now'
                  : otherUserJobTitle || 'Offline'
                : headerSubtitle}
            </div>

            {!isDirect && groupMembers.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {groupMembers.slice(0, 6).map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full bg-[#fff7df] px-2 py-0.5 text-[11px] font-medium text-[#8f6f16]"
                  >
                    {member.id === currentUserId ? 'You' : member.full_name}
                  </span>
                ))}
                {groupMembers.length > 6 ? (
                  <span className="rounded-full bg-[#f3efe8] px-2 py-0.5 text-[11px] font-medium text-[#7b6f5a]">
                    +{groupMembers.length - 6}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[#faf8f4] px-4 py-5"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
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
                  className={`flex max-w-[82%] items-end gap-2 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isMine ? (
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
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
                  ) : (
                    <div className="w-9" />
                  )}

                  <div
                    className={`rounded-[22px] px-4 py-3 shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#f2d27a] text-[#1f1f1f]'
                        : 'border border-[#ece5d8] bg-white text-[#1f1f1f]'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div
                        className={`text-[11px] font-semibold ${
                          isMine ? 'text-[#5a470f]' : 'text-[#a88414]'
                        }`}
                      >
                        {isMine ? 'You' : senderName}
                      </div>

                      <button
                        type="button"
                        onClick={() => setReplyTo(message)}
                        className={`text-[11px] font-semibold ${
                          isMine ? 'text-[#5a470f]' : 'text-[#a88414]'
                        }`}
                      >
                        Reply
                      </button>
                    </div>

                    {repliedMessage ? (
                      <div
                        className={`mb-2 rounded-[14px] px-3 py-2 text-xs ${
                          isMine ? 'bg-white/40 text-[#3d3210]' : 'bg-[#f8f4ea] text-[#6f624e]'
                        }`}
                      >
                        {senderNames[repliedMessage.sender_id] ?? 'User'}:{' '}
                        {repliedMessage.content?.trim() ||
                          (repliedMessage.attachment_url ? 'Attached file' : 'Message')}
                      </div>
                    ) : null}

                    {message.content ? (
                      <div className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.content}
                      </div>
                    ) : null}

                    {message.attachment_url ? (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-2 block text-sm font-semibold underline ${
                          isMine ? 'text-[#3d3210]' : 'text-[#a88414]'
                        }`}
                      >
                        Open attached file
                      </a>
                    ) : null}

                    <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
                      <span className={isMine ? 'text-[#5a470f]' : 'text-[#8f836c]'}>
                        {formatMessageTime(message.created_at)}
                      </span>

                      {isMine && isDirect && message.id === lastOwnMessage?.id ? (
                        <span
                          className={
                            isLastOwnMessageSeen ? 'text-emerald-700' : 'text-[#5a470f]'
                          }
                        >
                          {isLastOwnMessageSeen ? 'Seen' : 'Sent'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[#ece5d8] bg-white px-4 py-4"
      >
        {replyTo ? (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#a88414]">
                Replying to{' '}
                {replyTo.sender_id === currentUserId
                  ? 'yourself'
                  : senderNames[replyTo.sender_id] ?? 'User'}
              </div>
              <div className="truncate text-sm text-[#5d5346]">{replyPreviewText}</div>
            </div>

            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-sm font-semibold text-[#7b6f5a]"
            >
              ×
            </button>
          </div>
        ) : null}

        {messageError ? (
          <div className="mb-3 rounded-[16px] bg-red-50 px-4 py-3 text-sm text-red-600">
            {messageError}
          </div>
        ) : null}

        <div className="flex items-end gap-3">
          <div className="flex-1 rounded-[22px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3">
            <textarea
              value={content}
              onChange={(e) =>
                isDirect ? void handleTyping(e.target.value) : setContent(e.target.value)
              }
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={
                isDirect ? 'Write a message...' : `Message ${groupName ?? 'group'}...`
              }
              className="max-h-40 min-h-[72px] w-full resize-none bg-transparent text-sm text-[#1f1f1f] outline-none placeholder:text-[#9a8d75]"
            />
          </div>

          <label className="flex h-12 cursor-pointer items-center justify-center rounded-[18px] border border-[#ece5d8] bg-white px-4 text-sm font-medium text-[#7b6f5a] shadow-sm">
            File
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={isSending}
            className="h-12 rounded-[18px] bg-gradient-to-r from-[#d4af37] to-[#f2d27a] px-5 text-sm font-semibold text-[#1f1f1f] shadow-sm disabled:opacity-60"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {file ? (
          <div className="mt-3 text-sm text-[#7b6f5a]">Selected file: {file.name}</div>
        ) : null}
      </form>
    </div>
  )
}
