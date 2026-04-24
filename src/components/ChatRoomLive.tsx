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
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)

  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
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
  const uiChannelRef = useRef<any>(null)
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
      .select('last_seen_at')
      .eq('user_id', otherUserId)
      .maybeSingle()

    if (presence?.last_seen_at) {
      setOtherOnline(Date.now() - new Date(presence.last_seen_at).getTime() < 35_000)
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

        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.rpc('send_group_message_v1', {
          target_chat_id: chatId,
          message_content: trimmedContent || 'Attached file',
          message_attachment_url: attachmentUrl,
          reply_to: replyTo?.id ?? null,
        })

        if (error) throw new Error(error.message)
      }

      setContent('')
      setFile(null)
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
        content: null,
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
              {chatType === 'group' ? localGroupName || headerTitle : headerTitle}
            </div>

            <div className="mt-1 text-sm text-[#7b6f5a]">
              {isDirect
                ? typing
                  ? `${otherUserName} is typing...`
                  : otherOnline
                    ? 'Online now'
                    : otherUserJobTitle || 'Offline'
                : `${localGroupMembers.length} members`}
            </div>

            {!isDirect && localGroupMembers.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
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
              className="rounded-[18px] bg-[#f3efe8] px-4 py-2 text-sm font-semibold text-[#5d5346]"
            >
              Members
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            className="rounded-[18px] bg-[#f3efe8] px-4 py-2 text-sm font-semibold text-[#5d5346]"
          >
            Search
          </button>
        </div>

        {showSearch ? (
          <div className="mt-4 rounded-[20px] border border-[#ece5d8] bg-white p-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this chat..."
              className="w-full rounded-[16px] bg-[#fcfbf8] px-4 py-3 text-sm outline-none"
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
          <div className="mt-4 rounded-[20px] border border-[#ece5d8] bg-white p-4">
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
                    className="flex items-center justify-between rounded-[16px] bg-[#faf8f4] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
                      className="flex items-center gap-3 rounded-[16px] bg-[#faf8f4] px-3 py-2 text-left hover:bg-[#f7f1e2]"
                    >
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                        {person.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
          <div className="mt-4 rounded-[20px] border border-[#eadfbe] bg-[#fff8df] p-3">
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

      <div
  ref={scrollRef}
  className="relative min-h-0 flex-1 overflow-y-auto bg-[#faf8f4] bg-cover bg-center bg-no-repeat bg-fixed px-4 py-5"
  style={{
    backgroundImage:
      'linear-gradient(rgba(255, 248, 226, 0.35), rgba(255, 248, 226, 0.35)), url("/images/chat-background.png")',
  }}
>
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
                className={`animate-[fadeIn_180ms_ease-out] flex ${
                  isMine ? 'justify-end' : 'justify-start'
                } ${isGrouped ? 'mt-1' : 'mt-4'}`}
              >
                <div
                  className={`flex max-w-[72%] items-end gap-2 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >

                  {!isMine && !isGrouped ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
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
                    <div className="w-9 shrink-0" />
                  )}

                  <div
                    className={`relative rounded-[22px] px-4 py-3 shadow-lg backdrop-blur-[1px] transition hover:-translate-y-0.5 hover:shadow-xl ${
                      isMine
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#f2d27a] text-[#1f1f1f]'
                        : 'border border-[#ece5d8] bg-white text-[#1f1f1f]'
                    } ${message.deleted_at ? 'opacity-60' : ''}`}
                  >
                    {!isGrouped ? (
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div
                          className={`text-[11px] font-semibold ${
                            isMine ? 'text-[#5a470f]' : 'text-[#a88414]'
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
                              className={isMine ? 'text-[#5a470f]' : 'text-[#a88414]'}
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
                          isMine ? 'bg-white/40 text-[#3d3210]' : 'bg-[#f8f4ea] text-[#6f624e]'
                        }`}
                      >
                        {senderNames[repliedMessage.sender_id] ?? 'User'}:{' '}
                        {messageText(repliedMessage)}
                      </button>
                    ) : null}

                    {message.content && !message.deleted_at ? (
                      <div className="whitespace-pre-wrap break-words text-sm leading-6">
                        {highlightText(message.content, searchQuery)}
                      </div>
                    ) : (
                      <div className="text-sm italic leading-6">
                        {message.deleted_at ? 'Message deleted' : null}
                      </div>
                    )}

                    {message.attachment_url && !message.deleted_at ? (
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
                        <span className={isMine ? 'text-[#5a470f]' : 'text-[#8f836c]'}>
                          edited
                        </span>
                      ) : null}

                      {isPinned ? (
                        <span className={isMine ? 'text-[#5a470f]' : 'text-[#8f836c]'}>
                          pinned
                        </span>
                      ) : null}

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

                      {isMine && !isDirect && message.id === lastOwnMessage?.id ? (
                        <span className="text-[#5a470f]">Sent</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#ece5d8] bg-white px-4 py-4">
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

        <div className="relative flex items-end gap-3">
          {showMentionMenu && filteredMentions.length ? (
            <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-[20px] border border-[#ece5d8] bg-white shadow-xl">
              {filteredMentions.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => insertMention(person.full_name)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#f7f1e2]"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-xs font-semibold text-[#8e7b56]">
                    {person.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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

          <div className="flex-1 rounded-[22px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3">
            <textarea
              value={content}
              onChange={(e) => void handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : isDirect
                    ? 'Write a message...'
                    : `Message ${groupName ?? 'group'}... Use @ to mention`
              }
              className="max-h-40 min-h-[72px] w-full resize-none bg-transparent text-sm text-[#1f1f1f] outline-none placeholder:text-[#9a8d75]"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setContent((prev) => `${prev}${emoji}`)}
                  className="rounded-full bg-white px-2 py-1 text-sm transition hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
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
            {isSending ? 'Sending...' : editingMessage ? 'Save' : 'Send'}
          </button>
        </div>

        {file ? (
          <div className="mt-3 flex items-center justify-between rounded-[16px] bg-[#fcfbf8] px-4 py-3 text-sm text-[#7b6f5a]">
            <span>Selected file: {file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
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
