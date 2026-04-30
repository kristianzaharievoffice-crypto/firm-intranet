'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  content: string | null
  created_at: string
  sender_id: string
  chat_id: string
  attachment_url?: string | null
  reply_to_message_id?: string | null
  edited_at?: string | null
  deleted_at?: string | null
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

type ReactionRow = {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

type PinRow = {
  id: string
  chat_id: string
  message_id: string
  pinned_by: string
  created_at: string
}

type PresenceStatus = 'available' | 'busy'

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '✅', '👏']
const QUICK_EMOJIS = ['😀', '😂', '🔥', '👍', '❤️', '✅', '🙏', '🚀']

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function messageText(message: Message) {
  if (message.deleted_at) return 'Message deleted'
  return message.content?.trim() || (message.attachment_url ? 'Attached file' : '')
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 px-1">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}

function sameMinute(a: Message, b: Message) {
  return Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 60_000
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
  availableMembers,
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
  availableMembers: GroupMember[]
  headerTitle: string
  headerSubtitle: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const isDirect = chatType === 'direct'

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [pins, setPins] = useState<PinRow[]>([])
  const [typing, setTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherPresenceStatus, setOtherPresenceStatus] =
    useState<PresenceStatus>('available')
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)

  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [messageError, setMessageError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showMentionMenu, setShowMentionMenu] = useState(false)

  const [localGroupName, setLocalGroupName] = useState(groupName ?? '')
  const [localGroupMembers, setLocalGroupMembers] = useState<GroupMember[]>(groupMembers)
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uiChannelRef = useRef<RealtimeChannel | null>(null)
  const shouldStickBottomRef = useRef(true)
  const markingReadRef = useRef(false)
  const clearingNotificationsRef = useRef(false)

  const currentChatLink = `/chat/${chatId}`

  const peopleForMentions = useMemo(() => {
    const base =
      chatType === 'group'
        ? localGroupMembers
        : otherUserId
          ? [
              {
                id: otherUserId,
                full_name: otherUserName || 'User',
                avatar_url: otherUserAvatar,
                job_title: otherUserJobTitle,
              },
            ]
          : []

    return base.filter((person) => person.id !== currentUserId)
  }, [
    chatType,
    localGroupMembers,
    otherUserId,
    otherUserName,
    otherUserAvatar,
    otherUserJobTitle,
    currentUserId,
  ])

  const filteredMentions = useMemo(() => {
    const lastAt = content.lastIndexOf('@')
    if (lastAt === -1) return []

    const query = content.slice(lastAt + 1).toLowerCase()

    return peopleForMentions
      .filter((person) => person.full_name.toLowerCase().includes(query))
      .slice(0, 6)
  }, [content, peopleForMentions])

  const pinnedMessages = useMemo(() => {
    const pinIds = new Set(pins.map((pin) => pin.message_id))
    return messages.filter((message) => pinIds.has(message.id) && !message.deleted_at)
  }, [pins, messages])

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, ReactionRow[]>()

    for (const reaction of reactions) {
      const current = map.get(reaction.message_id) ?? []
      current.push(reaction)
      map.set(reaction.message_id, current)
    }

    return map
  }, [reactions])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []

    return messages.filter((message) => message.content?.toLowerCase().includes(q))
  }, [messages, searchQuery])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(
        'id, content, created_at, sender_id, chat_id, attachment_url, reply_to_message_id, edited_at, deleted_at'
      )
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    setMessages((data ?? []) as Message[])
  }

  const loadReactions = async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji')

    setReactions((data ?? []) as ReactionRow[])
  }

  const loadPins = async () => {
    const { data } = await supabase
      .from('message_pins')
      .select('id, chat_id, message_id, pinned_by, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })

    setPins((data ?? []) as PinRow[])
  }

  const refreshGroupMembers = async () => {
    if (chatType !== 'group') return

    const { data: memberRows } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)

    const ids = (memberRows ?? []).map((row) => row.user_id as string)

    if (!ids.length) {
      setLocalGroupMembers([])
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title')
      .in('id', ids)

    setLocalGroupMembers(
      (profiles ?? []).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name ?? 'User',
        avatar_url: profile.avatar_url ?? null,
        job_title: profile.job_title ?? null,
      }))
    )
  }

  const renameGroup = async () => {
    const nextName = window.prompt('Group name', localGroupName)
    if (!nextName || !nextName.trim()) return

    const { error } = await supabase
      .from('chats')
      .update({ name: nextName.trim() })
      .eq('id', chatId)
      .eq('chat_type', 'group')

    if (error) {
      setMessageError(error.message)
      return
    }

    setLocalGroupName(nextName.trim())
  }

  const addMemberToGroup = async (userId: string) => {
    const { error } = await supabase.from('chat_members').insert({
      chat_id: chatId,
      user_id: userId,
    })

    if (error) {
      setMessageError(error.message)
      return
    }

    await refreshGroupMembers()
  }

  const removeMemberFromGroup = async (userId: string) => {
    const ok = window.confirm(
      userId === currentUserId
        ? 'Remove yourself from this group?'
        : 'Remove this member from the group?'
    )

    if (!ok) return

    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) {
      setMessageError(error.message)
      return
    }

    await refreshGroupMembers()
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const scrollToMessage = (messageId: string) => {
    messageRefs.current[messageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
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
      .select('last_seen_at, status')
      .eq('user_id', otherUserId)
      .maybeSingle()

    if (presence?.last_seen_at) {
      setOtherOnline(Date.now() - new Date(presence.last_seen_at).getTime() < 60_000)
      setOtherPresenceStatus(presence.status === 'busy' ? 'busy' : 'available')
    } else {
      setOtherOnline(false)
      setOtherPresenceStatus('available')
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
    setLocalGroupName(groupName ?? '')
    setLocalGroupMembers(groupMembers)
    setTimeout(() => scrollToBottom('auto'), 40)
  }, [initialMessages, groupName, groupMembers])

  useEffect(() => {
    void loadReactions()
    void loadPins()
  }, [chatId])

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
      shouldStickBottomRef.current = distance < 140
    }

    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [])

  useEffect(() => {
    const messagesChannel = supabase
      .channel(`chat-room-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
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

    const reactionsChannel = supabase
      .channel(`chat-room-reactions-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async () => {
          await loadReactions()
        }
      )
      .subscribe()

    const pinsChannel = supabase
      .channel(`chat-room-pins-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_pins',
          filter: `chat_id=eq.${chatId}`,
        },
        async () => {
          await loadPins()
        }
      )
      .subscribe()

    const membersChannel = supabase
      .channel(`chat-room-members-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_members',
          filter: `chat_id=eq.${chatId}`,
        },
        async () => {
          await refreshGroupMembers()
        }
      )
      .subscribe()

    const uiChannel = supabase.channel(`chat-ui-${chatId}`)
    uiChannelRef.current = uiChannel

    uiChannel.on('broadcast', { event: 'reaction_changed' }, () => {
      void loadReactions()
    })

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
    }

    uiChannel.subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(reactionsChannel)
      supabase.removeChannel(pinsChannel)
      supabase.removeChannel(membersChannel)
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

  const broadcastReactionChange = async (messageId: string) => {
    if (!uiChannelRef.current) return

    await uiChannelRef.current.send({
      type: 'broadcast',
      event: 'reaction_changed',
      payload: {
        userId: currentUserId,
        messageId,
      },
    })
  }

  const handleTyping = async (value: string) => {
    setContent(value)

    const lastAt = value.lastIndexOf('@')
    setShowMentionMenu(lastAt !== -1 && value.slice(lastAt).length <= 24)

    if (!isDirect) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    await broadcastTyping(true)

    typingTimeoutRef.current = setTimeout(async () => {
      await broadcastTyping(false)
    }, 1200)
  }

  const insertMention = (name: string) => {
    const lastAt = content.lastIndexOf('@')
    if (lastAt === -1) return

    const next = `${content.slice(0, lastAt)}@${name} `
    setContent(next)
    setShowMentionMenu(false)
  }

  const uploadAttachment = async (selectedFile: File) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('No active user.')
    }

    const originalName = selectedFile.name || 'file'
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${Date.now()}_${safeName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      })

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(uploadData.path)

    return {
      name: originalName,
      url: publicUrlData.publicUrl,
    }
  }

 const send = async () => {
  setMessageError('')

  const trimmedContent = content.trim()

  if (editingMessage) {
    if (!trimmedContent) {
      setMessageError('Edited message cannot be empty.')
      return
    }

    const { error } = await supabase
      .from('messages')
      .update({
        content: trimmedContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', editingMessage.id)
      .eq('sender_id', currentUserId)

    if (error) {
      setMessageError(error.message)
      return
    }

    setEditingMessage(null)
    setContent('')
    await loadMessages()
    return
  }

  if (!trimmedContent && !files.length) {
    setMessageError('Write a message or choose a file.')
    return
  }

  setIsSending(true)

  try {
    const attachments = []

    for (const selectedFile of files) {
      attachments.push(await uploadAttachment(selectedFile))
    }

    const messagesToSend = attachments.length
      ? attachments.map((attachment) => ({
          content: trimmedContent || `Attached file: ${attachment.name}`,
          attachmentUrl: attachment.url,
        }))
      : [
          {
            content: trimmedContent,
            attachmentUrl: null,
          },
        ]

    for (const messageToSend of messagesToSend) {
      if (isDirect) {
        const { error } = await supabase.rpc('send_message_v2', {
          target_chat_id: chatId,
          message_content: messageToSend.content,
          message_attachment_url: messageToSend.attachmentUrl,
          reply_to: replyTo?.id ?? null,
        })

        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.rpc('send_group_message_v1', {
          target_chat_id: chatId,
          message_content: messageToSend.content,
          message_attachment_url: messageToSend.attachmentUrl,
          reply_to: replyTo?.id ?? null,
        })

        if (error) throw new Error(error.message)
      }
    }

    setContent('')
    setFiles([])
    setReplyTo(null)
    setIsSending(false)
    setShowMentionMenu(false)

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


  const editMessage = (message: Message) => {
    if (message.sender_id !== currentUserId || message.deleted_at) return

    setEditingMessage(message)
    setContent(message.content ?? '')
    setReplyTo(null)
  }


  
const deleteMessage = async (message: Message) => {
  if (message.sender_id !== currentUserId) return

  const ok = window.confirm('Delete this message?')
  if (!ok) return

  const { error } = await supabase
    .from('messages')
    .update({
      content: '[deleted]',
      attachment_url: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', message.id)
    .eq('sender_id', currentUserId)

  if (error) {
    setMessageError(error.message)
    return
  }

  await loadMessages()
}


  const toggleReaction = async (message: Message, emoji: string) => {
    if (message.deleted_at) return

    const existing = reactions.find(
      (reaction) =>
        reaction.message_id === message.id &&
        reaction.user_id === currentUserId &&
        reaction.emoji === emoji
    )

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({
        message_id: message.id,
        user_id: currentUserId,
        emoji,
      })
    }

    await loadReactions()
    await broadcastReactionChange(message.id)
  }

  const togglePin = async (message: Message) => {
    if (message.deleted_at) return

    const existing = pins.find((pin) => pin.message_id === message.id)

    if (existing) {
      await supabase.from('message_pins').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_pins').insert({
        chat_id: chatId,
        message_id: message.id,
        pinned_by: currentUserId,
      })
    }

    await loadPins()
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

    if (e.key === 'Escape') {
      setEditingMessage(null)
      setReplyTo(null)
      setShowMentionMenu(false)
      setActionMenuId(null)
    }
  }

  const replyPreviewText = replyTo?.content?.trim()
    ? replyTo.content
    : replyTo?.attachment_url
      ? 'Attached file'
      : ''

  return (
    <div className="flex h-[calc(100dvh-96px)] min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/40 bg-white/60 shadow-xl backdrop-blur-md md:h-[calc(100vh-180px)] md:min-h-[620px] md:rounded-[28px]">
      <div className="shrink-0 border-b border-white/30 bg-white/70 px-3 py-3 backdrop-blur-md md:px-5 md:py-4">
        <div className="flex items-center gap-3 md:gap-4">
          {isDirect ? (
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-sm font-semibold text-[#8e7b56] md:h-14 md:w-14">
              {otherUserAvatar ? (
                <img
                  src={otherUserAvatar}
                  alt={otherUserName}
                  className="h-full w-full object-cover"
                />
              ) : (
                (otherUserName?.[0] ?? 'U').toUpperCase()
              )}

              <span
                className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white md:bottom-1 md:right-1 md:h-3.5 md:w-3.5 ${
                  otherOnline
                    ? otherPresenceStatus === 'busy'
                      ? 'bg-red-500'
                      : 'bg-emerald-500'
                    : 'bg-[#c7bda9]'
                }`}
              />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f6e7a7] to-[#d4af37] text-base font-semibold text-[#3a2e0b] md:h-14 md:w-14 md:text-lg">
              👥
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-[#1f1f1f] md:text-lg">
              {chatType === 'group' ? localGroupName || headerTitle : headerTitle}
            </div>

            <div className="mt-0.5 truncate text-xs text-[#7b6f5a] md:mt-1 md:text-sm">
              {isDirect
                ? typing
                  ? `${otherUserName} is typing...`
                  : otherOnline && otherPresenceStatus === 'busy'
                    ? 'Busy'
                  : otherOnline
                    ? 'Online now'
                    : otherUserJobTitle || 'Offline'
                : `${localGroupMembers.length} members`}
            </div>

            {!isDirect && localGroupMembers.length ? (
              <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
                {localGroupMembers.slice(0, 6).map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full bg-[#fff7df] px-2 py-0.5 text-[11px] font-medium text-[#8f6f16]"
                  >
                    {member.id === currentUserId ? 'You' : member.full_name}
                  </span>
                ))}
                {localGroupMembers.length > 6 ? (
                  <span className="rounded-full bg-[#f3efe8] px-2 py-0.5 text-[11px] font-medium text-[#7b6f5a]">
                    +{localGroupMembers.length - 6}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {chatType === 'group' ? (
            <button
              type="button"
              onClick={() => setShowGroupPanel((prev) => !prev)}
              className="rounded-[14px] bg-white/70 px-3 py-2 text-xs font-semibold text-[#5d5346] shadow-sm backdrop-blur-sm md:rounded-[18px] md:px-4 md:text-sm"
            >
              Members
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            className="rounded-[14px] bg-white/70 px-3 py-2 text-xs font-semibold text-[#5d5346] shadow-sm backdrop-blur-sm md:rounded-[18px] md:px-4 md:text-sm"
          >
            Search
          </button>
        </div>

        {showSearch ? (
          <div className="mt-3 rounded-[18px] border border-white/40 bg-white/80 p-3 backdrop-blur-md md:mt-4 md:rounded-[20px]">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this chat..."
              className="w-full rounded-[14px] bg-white/80 px-3 py-2 text-sm outline-none md:rounded-[16px] md:px-4 md:py-3"
            />

            {searchQuery.trim() ? (
              <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                {searchResults.length ? (
                  searchResults.slice(0, 8).map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => scrollToMessage(message.id)}
                      className="block w-full rounded-[14px] bg-[#faf8f4] px-3 py-2 text-left text-sm text-[#5d5346]"
                    >
                      {senderNames[message.sender_id] ?? 'User'}: {message.content}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-[#8f836c]">No results</div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {showGroupPanel && chatType === 'group' ? (
          <div className="mt-3 max-h-[42dvh] overflow-y-auto rounded-[18px] border border-white/40 bg-white/80 p-3 backdrop-blur-md md:mt-4 md:max-h-none md:rounded-[20px] md:p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[#1f1a14]">Group settings</div>
                <div className="text-xs text-[#8f836c]">Manage name and members</div>
              </div>

              <button
                type="button"
                onClick={renameGroup}
                className="rounded-full bg-[#fff7df] px-3 py-2 text-xs font-semibold text-[#8f6f16]"
              >
                Rename
              </button>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#8f6f16]">
                Members
              </div>

              <div className="space-y-2">
                {localGroupMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-[16px] bg-[#faf8f4]/90 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.full_name[0]?.toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-[#1f1a14]">
                          {member.id === currentUserId ? 'You' : member.full_name}
                        </div>
                        <div className="text-xs text-[#8f836c]">
                          {member.job_title || 'Team member'}
                        </div>
                      </div>
                    </div>

                    {localGroupMembers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMemberFromGroup(member.id)}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#8f6f16]">
                Add members
              </div>

              <div className="flex max-h-48 flex-col gap-2 overflow-auto">
                {availableMembers
                  .filter(
                    (person) =>
                      !localGroupMembers.some((member) => member.id === person.id)
                  )
                  .map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => addMemberToGroup(person.id)}
                      className="flex items-center gap-3 rounded-[16px] bg-[#faf8f4]/90 px-3 py-2 text-left hover:bg-[#f7f1e2]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                        {person.avatar_url ? (
                          <img
                            src={person.avatar_url}
                            alt={person.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          person.full_name[0]?.toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-[#1f1a14]">
                          {person.full_name}
                        </div>
                        <div className="text-xs text-[#8f836c]">
                          {person.job_title || 'Team member'}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : null}

        {pinnedMessages.length ? (
          <div className="mt-3 rounded-[18px] border border-[#eadfbe] bg-[#fff8df]/90 p-3 backdrop-blur-sm md:mt-4 md:rounded-[20px]">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#8f6f16]">
              Pinned messages
            </div>
            <div className="flex flex-wrap gap-2">
              {pinnedMessages.slice(0, 4).map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => scrollToMessage(message.id)}
                  className="max-w-xs truncate rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#5d5346]"
                >
                  {messageText(message)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-2 py-3 md:px-4 md:py-5">
        <div className="flex w-full flex-col gap-2">
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const isMine = message.sender_id === currentUserId
            const isGrouped =
              previous &&
              previous.sender_id === message.sender_id &&
              sameMinute(previous, message)

            const senderName =
              message.sender_id === currentUserId
                ? currentUserName
                : senderNames[message.sender_id] ?? 'User'

            const senderAvatar = senderAvatars[message.sender_id] ?? null
            const repliedMessage = message.reply_to_message_id
              ? messages.find((m) => m.id === message.reply_to_message_id)
              : null

            const messageReactions = reactionsByMessage.get(message.id) ?? []
            const groupedReactions = QUICK_REACTIONS.map((emoji) => {
              const rows = messageReactions.filter((reaction) => reaction.emoji === emoji)
              return {
                emoji,
                count: rows.length,
                reactedByMe: rows.some((reaction) => reaction.user_id === currentUserId),
              }
            }).filter((item) => item.count > 0)

            const isPinned = pins.some((pin) => pin.message_id === message.id)

            return (
              <div
                key={message.id}
                ref={(node) => {
                  messageRefs.current[message.id] = node
                }}
                className={`animate-[fadeIn_180ms_ease-out] flex w-full ${
                  isMine ? 'justify-end' : 'justify-start'
                } ${isGrouped ? 'mt-1' : 'mt-4'}`}
              >
                <div
                  className={`flex max-w-[92%] items-end gap-1.5 md:max-w-[72%] md:gap-2 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isMine && !isGrouped ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-[11px] font-semibold text-[#8e7b56] shadow-sm md:h-9 md:w-9 md:text-xs">
                      {senderAvatar ? (
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
                    <div className="w-7 shrink-0 md:w-9" />
                  )}

                  <div
                    className={`relative rounded-[18px] px-3 py-2.5 shadow-lg backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-xl md:rounded-[22px] md:px-4 md:py-3 ${
                      isMine
                        ? 'bg-[#c9a227] text-white'
                        : 'border border-white/50 bg-white/90 text-[#1f1f1f]'
                    } ${message.deleted_at ? 'opacity-60' : ''}`}
                  >
                    {!isGrouped ? (
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div
                          className={`text-[11px] font-semibold ${
                            isMine ? 'text-white/80' : 'text-[#a88414]'
                          }`}
                        >
                          {isMine ? 'You' : senderName}
                        </div>

                        {!message.deleted_at ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuId((prev) =>
                                  prev === message.id ? null : message.id
                                )
                              }
                              className={isMine ? 'text-white/80' : 'text-[#a88414]'}
                            >
                              ⋯
                            </button>

                            {actionMenuId === message.id ? (
                              <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-[16px] border border-[#ece5d8] bg-white text-[#1f1f1f] shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTo(message)
                                    setActionMenuId(null)
                                  }}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[#f7f1e2]"
                                >
                                  Reply
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void togglePin(message)
                                    setActionMenuId(null)
                                  }}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[#f7f1e2]"
                                >
                                  {isPinned ? 'Unpin' : 'Pin'}
                                </button>

                                {isMine ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        editMessage(message)
                                        setActionMenuId(null)
                                      }}
                                      className="block w-full px-3 py-2 text-left text-xs hover:bg-[#f7f1e2]"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        void deleteMessage(message)
                                        setActionMenuId(null)
                                      }}
                                      className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {repliedMessage ? (
                      <button
                        type="button"
                        onClick={() => scrollToMessage(repliedMessage.id)}
                        className={`mb-2 block w-full rounded-[14px] px-3 py-2 text-left text-xs ${
                          isMine
                            ? 'bg-white/25 text-white'
                            : 'bg-[#f8f4ea] text-[#6f624e]'
                        }`}
                      >
                        {senderNames[repliedMessage.sender_id] ?? 'User'}:{' '}
                        {messageText(repliedMessage)}
                      </button>
                    ) : null}

                    <div
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        message.deleted_at
                          ? isMine
                            ? 'text-white/70 italic'
                            : 'text-[#8f836c] italic'
                          : isMine
                            ? 'text-white'
                            : 'text-[#1f1f1f]'
                      }`}
                    >
                      {highlightText(messageText(message), searchQuery)}
                    </div>

                    {message.attachment_url && !message.deleted_at ? (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-2 block text-sm font-semibold underline ${
                          isMine ? 'text-white' : 'text-[#a88414]'
                        }`}
                      >
                        Open attachment
                      </a>
                    ) : null}

                    {!message.deleted_at ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(message, emoji)}
                            className="rounded-full bg-white/60 px-2 py-1 text-xs transition hover:scale-110"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {groupedReactions.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {groupedReactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            type="button"
                            onClick={() => toggleReaction(message, reaction.emoji)}
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              reaction.reactedByMe
                                ? 'bg-[#1f1a14] text-white'
                                : 'bg-white/70 text-[#5d5346]'
                            }`}
                          >
                            {reaction.emoji} {reaction.count}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
                      {message.edited_at && !message.deleted_at ? (
                        <span className={isMine ? 'text-white/70' : 'text-[#8f836c]'}>
                          edited
                        </span>
                      ) : null}

                      {isPinned ? (
                        <span className={isMine ? 'text-white/70' : 'text-[#8f836c]'}>
                          pinned
                        </span>
                      ) : null}

                      <span className={isMine ? 'text-white/70' : 'text-[#8f836c]'}>
                        {formatMessageTime(message.created_at)}
                      </span>

                      {isMine && isDirect && message.id === lastOwnMessage?.id ? (
                        <span
                          className={
                            isLastOwnMessageSeen ? 'text-emerald-100' : 'text-white/70'
                          }
                        >
                          {isLastOwnMessageSeen ? 'Seen' : 'Sent'}
                        </span>
                      ) : null}

                      {isMine && !isDirect && message.id === lastOwnMessage?.id ? (
                        <span className="text-white/70">Sent</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/30 bg-white/70 px-3 py-3 backdrop-blur-md md:px-4 md:py-4">
        {editingMessage ? (
          <div className="mb-3 flex items-center justify-between rounded-[18px] border border-[#ece5d8] bg-[#fff8df] px-4 py-3">
            <div className="text-sm font-semibold text-[#5d5346]">Editing message</div>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null)
                setContent('')
              }}
              className="text-sm font-semibold text-[#7b6f5a]"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {replyTo ? (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8]/90 px-4 py-3">
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

        <div className="relative flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
          {showMentionMenu && filteredMentions.length ? (
            <div className="absolute bottom-full left-0 mb-2 w-full max-w-72 overflow-hidden rounded-[20px] border border-[#ece5d8] bg-white shadow-xl">
              {filteredMentions.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => insertMention(person.full_name)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#f7f1e2]"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      person.full_name[0]?.toUpperCase()
                    )}
                  </div>
                  <span>{person.full_name}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="w-full flex-1 rounded-[18px] border border-white/40 bg-white/75 px-3 py-2.5 backdrop-blur-sm md:rounded-[22px] md:px-4 md:py-3">
            <textarea
              value={content}
              onChange={(e) => void handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : isDirect
                    ? 'Write a message...'
                    : `Message ${groupName ?? 'group'}... Use @ to mention`
              }
              className="max-h-28 min-h-[44px] w-full resize-none bg-transparent text-sm text-[#1f1f1f] outline-none placeholder:text-[#9a8d75] md:max-h-40 md:min-h-[72px]"
            />

            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setContent((prev) => `${prev}${emoji}`)}
                  className="shrink-0 rounded-full bg-white px-2 py-1 text-sm transition hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <label className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[16px] border border-white/40 bg-white/80 px-4 text-sm font-medium text-[#7b6f5a] shadow-sm md:h-12 md:flex-none md:rounded-[18px]">
              File
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>

            <button
              type="submit"
              disabled={isSending}
              className="h-11 flex-1 rounded-[16px] bg-gradient-to-r from-[#d4af37] to-[#f2d27a] px-5 text-sm font-semibold text-[#1f1f1f] shadow-sm disabled:opacity-60 md:h-12 md:flex-none md:rounded-[18px]"
            >
              {isSending ? 'Sending...' : editingMessage ? 'Save' : 'Send'}
            </button>
          </div>
        </div>

        {files.length ? (
          <div className="mt-3 flex items-center justify-between rounded-[16px] bg-[#fcfbf8]/90 px-4 py-3 text-sm text-[#7b6f5a]">
            <span className="min-w-0 truncate">
              Selected files: {files.map((selectedFile) => selectedFile.name).join(', ')}
            </span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="font-semibold text-[#a88414]"
            >
              Remove
            </button>
          </div>
        ) : null}
      </form>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
