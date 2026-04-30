'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
}

interface ChatRow {
  id: string
  chat_type: 'direct' | 'group'
  name: string | null
  created_by: string | null
  user1_id: string | null
  user2_id: string | null
  admin_id: string | null
  employee_id: string | null
}

interface ChatMemberRow {
  chat_id: string
  user_id: string
}

interface MessageRow {
  id: string
  chat_id: string
  sender_id: string
  content: string | null
  created_at: string
  attachment_url: string | null
}

interface ChatReadRow {
  chat_id: string
  last_read_at: string | null
}

interface PresenceRow {
  user_id: string
  last_seen_at: string | null
}

type RealtimePresenceMeta = {
  user_id?: string
  online_at?: string
}

type RealtimePresenceState = Record<string, RealtimePresenceMeta[]>

type DirectUserItem = {
  kind: 'direct'
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  department: string | null
  existing_chat_id: string | null
  unread_count: number
  last_message: string
  last_message_at: string | null
  is_online: boolean
}

type GroupChatItem = {
  kind: 'group'
  id: string
  name: string
  member_count: number
  member_names: string[]
  unread_count: number
  last_message: string
  last_message_at: string | null
}

type ListItem = DirectUserItem | GroupChatItem

function formatTime(value: string | null) {
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

function createClientUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function presenceUserIds(state: RealtimePresenceState, currentUserId: string) {
  return Array.from(
    new Set(
      Object.values(state)
        .flat()
        .map((presence) => presence.user_id)
        .filter((id): id is string => Boolean(id) && id !== currentUserId)
    )
  )
}

export default function ChatDirectory({
  currentUserId,
}: {
  currentUserId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [query, setQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const realtimeOnlineUserIdsRef = useRef<Set<string>>(new Set())

  const loadDirectory = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title, department')
      .neq('id', currentUserId)
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('profiles load error:', profilesError)
      return
    }

    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(
        'id, chat_type, name, created_by, user1_id, user2_id, admin_id, employee_id'
      )

    if (chatsError) {
      console.error('chats load error:', chatsError)
      return
    }

    const { data: membersData, error: membersError } = await supabase
      .from('chat_members')
      .select('chat_id, user_id')

    if (membersError) {
      console.error('chat_members load error:', membersError)
      return
    }

    const people = (profilesData ?? []) as ProfileRow[]
    const chats = (chatsData ?? []) as ChatRow[]
    const chatMembers = (membersData ?? []) as ChatMemberRow[]

    setProfiles(people)

    const myDirectChats = chats.filter((chat) => {
      if (chat.chat_type === 'group') return false
      const first = chat.user1_id ?? chat.admin_id
      const second = chat.user2_id ?? chat.employee_id
      return first === currentUserId || second === currentUserId
    })

    const myGroupChatIds = new Set(
      chatMembers
        .filter((member) => member.user_id === currentUserId)
        .map((member) => member.chat_id)
    )

    const myGroupChats = chats.filter(
      (chat) => chat.chat_type === 'group' && myGroupChatIds.has(chat.id)
    )

    const allChatIds = [...myDirectChats, ...myGroupChats].map((chat) => chat.id)

    let messages: MessageRow[] = []
    let reads: ChatReadRow[] = []

    if (allChatIds.length) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, chat_id, sender_id, content, created_at, attachment_url')
        .in('chat_id', allChatIds)
        .order('created_at', { ascending: false })

      const { data: readsData } = await supabase
        .from('chat_reads')
        .select('chat_id, last_read_at')
        .eq('user_id', currentUserId)
        .in('chat_id', allChatIds)

      messages = (messagesData ?? []) as MessageRow[]
      reads = (readsData ?? []) as ChatReadRow[]
    }

    const otherUserIds = myDirectChats
      .map((chat) => {
        const first = chat.user1_id ?? chat.admin_id
        const second = chat.user2_id ?? chat.employee_id
        if (!first || !second) return null
        return first === currentUserId ? second : first
      })
      .filter(Boolean) as string[]

    let presences: PresenceRow[] = []
    if (otherUserIds.length) {
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, last_seen_at')
        .in('user_id', otherUserIds)

      presences = (presenceData ?? []) as PresenceRow[]
    }

    const presenceMap = new Map(presences.map((row) => [row.user_id, row.last_seen_at]))
    const readMap = new Map(reads.map((row) => [row.chat_id, row.last_read_at]))
    const peopleMap = new Map(people.map((person) => [person.id, person]))

    const directExistingChatMap = new Map<string, string>()
    const directUnreadMap = new Map<string, number>()
    const directLastMessageMap = new Map<
      string,
      { text: string; created_at: string | null }
    >()

    for (const chat of myDirectChats) {
      const first = chat.user1_id ?? chat.admin_id
      const second = chat.user2_id ?? chat.employee_id
      if (!first || !second) continue

      const otherUserId = first === currentUserId ? second : first
      directExistingChatMap.set(otherUserId, chat.id)

      const chatMessages = messages.filter((message) => message.chat_id === chat.id)
      const latest = chatMessages[0]

      if (latest) {
        const text =
          latest.content?.trim() || (latest.attachment_url ? 'Attached file' : 'New message')

        directLastMessageMap.set(otherUserId, {
          text: latest.sender_id === currentUserId ? `You: ${text}` : text,
          created_at: latest.created_at,
        })
      }

      const lastReadAt = readMap.get(chat.id)
      const unreadCount = chatMessages.filter((message) => {
        if (message.sender_id === currentUserId) return false
        if (!lastReadAt) return true
        return new Date(message.created_at).getTime() > new Date(lastReadAt).getTime()
      }).length

      directUnreadMap.set(otherUserId, unreadCount)
    }

    const mappedDirects: DirectUserItem[] = people.map((person) => {
      const lastSeenAt = presenceMap.get(person.id)
      const isOnline =
        realtimeOnlineUserIdsRef.current.has(person.id) ||
        (lastSeenAt
          ? Date.now() - new Date(lastSeenAt).getTime() < 35000
          : false)

      return {
        kind: 'direct',
        id: person.id,
        full_name: person.full_name ?? 'User',
        avatar_url: person.avatar_url ?? null,
        job_title: person.job_title ?? null,
        department: person.department ?? null,
        existing_chat_id: directExistingChatMap.get(person.id) ?? null,
        unread_count: directUnreadMap.get(person.id) ?? 0,
        last_message: directLastMessageMap.get(person.id)?.text ?? 'No messages yet',
        last_message_at: directLastMessageMap.get(person.id)?.created_at ?? null,
        is_online: isOnline,
      }
    })

    const membersByChat = new Map<string, string[]>()
    for (const row of chatMembers) {
      const current = membersByChat.get(row.chat_id) ?? []
      current.push(row.user_id)
      membersByChat.set(row.chat_id, current)
    }

    const mappedGroups: GroupChatItem[] = myGroupChats.map((chat) => {
      const memberIds = membersByChat.get(chat.id) ?? []
      const memberNames = memberIds
        .map((id) => (id === currentUserId ? 'You' : peopleMap.get(id)?.full_name ?? null))
        .filter(Boolean) as string[]

      const chatMessages = messages.filter((message) => message.chat_id === chat.id)
      const latest = chatMessages[0]
      const latestSenderName =
        latest?.sender_id === currentUserId
          ? 'You'
          : peopleMap.get(latest?.sender_id ?? '')?.full_name ?? 'User'

      const text = latest
        ? latest.content?.trim() || (latest.attachment_url ? 'Attached file' : 'New message')
        : 'No messages yet'

      const lastReadAt = readMap.get(chat.id)
      const unreadCount = chatMessages.filter((message) => {
        if (message.sender_id === currentUserId) return false
        if (!lastReadAt) return true
        return new Date(message.created_at).getTime() > new Date(lastReadAt).getTime()
      }).length

      return {
        kind: 'group',
        id: chat.id,
        name: chat.name?.trim() || 'Untitled group',
        member_count: memberIds.length,
        member_names: memberNames,
        unread_count: unreadCount,
        last_message: latest ? `${latestSenderName}: ${text}` : text,
        last_message_at: latest?.created_at ?? null,
      }
    })

    const combined: ListItem[] = [...mappedGroups, ...mappedDirects]

    combined.sort((a, b) => {
      if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count

      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      if (bTime !== aTime) return bTime - aTime

      const aName = a.kind === 'group' ? a.name : a.full_name
      const bName = b.kind === 'group' ? b.name : b.full_name
      return aName.localeCompare(bName)
    })


    setItems(combined)
  }

  useEffect(() => {
    void loadDirectory()

    const channel = supabase
      .channel(`chat-list-live-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () =>
        void loadDirectory()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void loadDirectory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () =>
        void loadDirectory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, () =>
        void loadDirectory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () =>
        void loadDirectory()
      )
      .subscribe()

    const presenceChannel = supabase
      .channel('site-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as RealtimePresenceState
        realtimeOnlineUserIdsRef.current = new Set(
          presenceUserIds(state, currentUserId)
        )
        void loadDirectory()
      })
      .subscribe()

    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadDirectory()
      }
    }, 2500)

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
      supabase.removeChannel(presenceChannel)
    }
  }, [currentUserId, supabase])

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase()
    if (!q) return true

    if (item.kind === 'group') {
      return (
        item.name.toLowerCase().includes(q) ||
        item.member_names.join(' ').toLowerCase().includes(q) ||
        item.last_message.toLowerCase().includes(q)
      )
    }

    return (
      item.full_name.toLowerCase().includes(q) ||
      (item.job_title ?? '').toLowerCase().includes(q) ||
      (item.department ?? '').toLowerCase().includes(q) ||
      item.last_message.toLowerCase().includes(q)
    )
  })

  const openDirectChat = async (userId: string, existingChatId: string | null) => {
    setLoadingId(userId)

    let chatId = existingChatId

    if (!chatId) {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
        other_user_id: userId,
      })

      if (error || !data) {
        console.error('get_or_create_direct_chat error:', error)
        setLoadingId(null)
        return
      }

      chatId = data as string
    }

    setLoadingId(null)
    router.push(`/chat/${chatId}`)
  }

  const openGroupChat = (chatId: string) => {
    router.push(`/chat/${chatId}`)
  }

  const toggleSelectedMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

const createGroup = async () => {
  const trimmedName = groupName.trim()
  if (!trimmedName) return
  if (!selectedMemberIds.length) return

  setCreatingGroup(true)

  const { data: createdChat, error: createChatError } = await supabase
    .from('chats')
    .insert({
      chat_type: 'group',
      name: trimmedName,
      created_by: currentUserId,
    })
    .select('id')
    .single()

  if (createChatError || !createdChat) {
    console.error(
      'create group chat insert error full:',
      JSON.stringify(createChatError, null, 2)
    )
    setCreatingGroup(false)
    return
  }

  const allMembers = Array.from(new Set([currentUserId, ...selectedMemberIds]))

  const { error: membersInsertError } = await supabase
    .from('chat_members')
    .insert(allMembers.map((userId) => ({ chat_id: createdChat.id, user_id: userId })))

  if (membersInsertError) {
    console.error(
      'chat_members insert error full:',
      JSON.stringify(membersInsertError, null, 2)
    )
    setCreatingGroup(false)
    return
  }

  setCreatingGroup(false)
  setGroupName('')
  setSelectedMemberIds([])
  setShowGroupModal(false)
  await loadDirectory()
  router.push(`/chat/${createdChat.id}`)
}


  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats, groups, people, departments..."
              className="w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm outline-none focus:border-[#c9a227]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowGroupModal(true)}
            className="rounded-[18px] bg-gradient-to-r from-[#d4af37] to-[#f2d27a] px-4 py-3 text-sm font-semibold text-[#1f1f1f] shadow-sm transition hover:brightness-105"
          >
            New Group
          </button>
        </div>

        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((item) => {
              if (item.kind === 'group') {
                return (
                  <button
                    key={`group-${item.id}`}
                    type="button"
                    onClick={() => openGroupChat(item.id)}
                    className="w-full rounded-[24px] border border-[#ece5d8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#f6e7a7] to-[#d4af37] text-lg font-semibold text-[#3a2e0b]">
                          👥
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-semibold text-[#1f1f1f]">
                              {item.name}
                            </div>
                            <span className="rounded-full bg-[#fff7df] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#a88414]">
                              Group
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-[#7b6f5a]">
                            {item.member_count} members
                          </div>

                          <div className="mt-1 truncate text-sm text-[#9a8d75]">
                            {item.member_names.slice(0, 4).join(', ')}
                            {item.member_names.length > 4 ? '…' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.last_message_at ? (
                            <span className="text-xs text-[#9a8d75]">
                              {formatTime(item.last_message_at)}
                            </span>
                          ) : null}
                          {item.unread_count > 0 ? (
                            <span className="rounded-full bg-[#d4af37] px-2 py-0.5 text-xs font-semibold text-white">
                              {item.unread_count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 truncate text-sm text-[#5d5346]">
                      {item.last_message}
                    </div>
                  </button>
                )
              }

              return (
                <button
                  key={`direct-${item.id}`}
                  type="button"
                  onClick={() => openDirectChat(item.id, item.existing_chat_id)}
                  disabled={loadingId === item.id}
                  className="w-full rounded-[24px] border border-[#ece5d8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-sm font-semibold text-[#8e7b56]">
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt={item.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (item.full_name?.[0] ?? 'U').toUpperCase()
                        )}

                        <span
                          className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            item.is_online ? 'bg-emerald-500' : 'bg-[#c7bda9]'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[#1f1f1f]">
                          {item.full_name}
                        </div>

                        <div className="mt-1 text-sm text-[#7b6f5a]">
                          {item.job_title || 'No job title'}
                          {item.department ? ` · ${item.department}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.last_message_at ? (
                          <span className="text-xs text-[#9a8d75]">
                            {formatTime(item.last_message_at)}
                          </span>
                        ) : null}
                        {item.unread_count > 0 ? (
                          <span className="rounded-full bg-[#d4af37] px-2 py-0.5 text-xs font-semibold text-white">
                            {item.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 truncate text-sm text-[#5d5346]">
                    {item.last_message}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={item.is_online ? 'text-emerald-600' : 'text-[#9a8d75]'}>
                      {item.is_online ? 'Online' : 'Offline'}
                    </span>
                    <span className="font-semibold text-[#a88414]">
                      {loadingId === item.id ? 'Opening...' : 'Open'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#ece5d8] bg-white p-6 text-sm text-[#7b6f5a] shadow-sm">
            No chats found.
          </div>
        )}
      </div>

      {showGroupModal ? (
        <div className="fixed inset-0 z-[110] bg-black/25 backdrop-blur-sm">
          <div className="absolute inset-x-4 top-1/2 mx-auto w-full max-w-2xl -translate-y-1/2 rounded-[28px] border border-[#ece5d8] bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div className="text-xl font-semibold text-[#1f1f1f]">Create Group Chat</div>
              <div className="mt-1 text-sm text-[#7b6f5a]">
                Choose a group name and select the members you want to add.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#5d5346]">
                  Group name
                </label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm outline-none focus:border-[#c9a227]"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-[#5d5346]">Members</div>
                <div className="max-h-[320px] space-y-2 overflow-auto rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] p-3">
                  {profiles.map((person) => {
                    const checked = selectedMemberIds.includes(person.id)

                    return (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-3 rounded-[16px] bg-white px-3 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedMember(person.id)}
                        />
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#f3ede3] text-sm font-semibold text-[#8e7b56]">
                          {person.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={person.avatar_url}
                              alt={person.full_name ?? 'User'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (person.full_name?.[0] ?? 'U').toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#1f1f1f]">
                            {person.full_name ?? 'User'}
                          </div>
                          <div className="text-xs text-[#8f836c]">
                            {person.job_title || 'Team member'}
                            {person.department ? ` · ${person.department}` : ''}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowGroupModal(false)
                  setGroupName('')
                  setSelectedMemberIds([])
                }}
                className="rounded-[18px] bg-[#f3efe8] px-4 py-3 text-sm font-medium text-[#5d5346]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createGroup}
                disabled={creatingGroup || !groupName.trim() || !selectedMemberIds.length}
                className="rounded-[18px] bg-gradient-to-r from-[#d4af37] to-[#f2d27a] px-4 py-3 text-sm font-semibold text-[#1f1f1f] shadow-sm disabled:opacity-50"
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


