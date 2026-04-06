'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SendMessageForm({ chatId }: { chatId: string }) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setMessage('Напиши съобщение.')
      return
    }

    setIsSending(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Няма активен потребител.')
      setIsSending(false)
      return
    }

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      content: trimmedContent,
    })

    if (error) {
      setMessage(error.message)
      setIsSending(false)
      return
    }

    setContent('')
    setIsSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold">Ново съобщение</h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Напиши съобщение..."
        className="w-full min-h-28 border rounded-xl px-4 py-3"
      />

      <button
        type="submit"
        disabled={isSending}
        className="bg-black text-white px-4 py-2 rounded-xl disabled:opacity-60"
      >
        {isSending ? 'Изпращане...' : 'Изпрати'}
      </button>

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  )
}