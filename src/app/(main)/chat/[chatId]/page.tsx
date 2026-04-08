export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SendMessageForm from '@/components/SendMessageForm'

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ✅ маркираме съобщенията като прочетени
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">Чат</h1>

      <div className="space-y-3">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-2xl max-w-md ${
              msg.sender_id === user.id
                ? 'bg-yellow-500 text-white ml-auto'
                : 'bg-gray-100'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <SendMessageForm chatId={chatId} />
    </main>
  )
}