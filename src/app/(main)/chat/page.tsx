export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .or(`user1.eq.${user.id},user2.eq.${user.id}`)

  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-extrabold">Чат</h1>

      {chats?.length ? (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className="block bg-white p-5 rounded-2xl border hover:shadow"
            >
              Чат #{chat.id.slice(0, 6)}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Нямаш чатове</p>
      )}
    </main>
  )
}