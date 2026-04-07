import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  let chatIds: string[] = []

  if (profile?.role === 'admin') {
    const { data: chats } = await supabase
      .from('chats')
      .select('id')

    chatIds = (chats ?? []).map((c) => c.id)
  } else {
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .eq('employee_id', user.id)

    chatIds = (chats ?? []).map((c) => c.id)
  }

  const safeChatIds = chatIds.length
    ? chatIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: readRows } = await supabase
    .from('chat_reads')
    .select('chat_id, last_read_at')
    .eq('user_id', user.id)

  const { data: chatMessages } = await supabase
    .from('messages')
    .select('chat_id, created_at, sender_id')
    .in('chat_id', safeChatIds)

  const readMap = new Map(
    (readRows ?? []).map((row) => [row.chat_id, row.last_read_at])
  )

  const unreadChatCount = (chatMessages ?? []).filter((message) => {
    if (message.sender_id === user.id) return false

    const lastReadAt = readMap.get(message.chat_id)
    if (!lastReadAt) return true

    return (
      new Date(message.created_at).getTime() >
      new Date(lastReadAt).getTime()
    )
  }).length

  async function signOut() {
    'use server'

    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-lg">RCX NETWORK</p>
          <p className="text-sm text-gray-500">
            {profile?.full_name || user.email} | {profile?.role || 'employee'}
          </p>
        </div>

        <nav className="flex items-center gap-4 flex-wrap">
          <Link href="/wall" className="hover:underline">
            Стена
          </Link>

          <Link href="/chat" className="hover:underline relative">
            Чат
            {unreadChatCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-semibold">
                {unreadChatCount}
              </span>
            )}
          </Link>

          <Link href="/events" className="hover:underline">
            Събития
          </Link>

          <Link href="/notifications" className="hover:underline relative">
            Известия
            {(notificationsCount ?? 0) > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-semibold">
                {notificationsCount}
              </span>
            )}
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          )}

          <form action={signOut}>
            <button type="submit" className="hover:underline">
              Изход
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
