'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SendMessageForm({ chatId }: { chatId: string }) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmedContent = content.trim()

    if (!trimmedContent && !file) {
      setMessage('Напиши съобщение или избери файл.')
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
        setMessage('Няма активен потребител.')
        setIsSending(false)
        return
      }

      const originalName = file.name || 'file'
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        setMessage(uploadError.message)
        setIsSending(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      attachmentUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.rpc('send_message', {
      target_chat_id: chatId,
      message_content: trimmedContent || (attachmentUrl ? 'Прикачен файл' : ''),
      message_attachment_url: attachmentUrl,
    })

    if (error) {
      setMessage(error.message)
      setIsSending(false)
      return
    }

    setContent('')
    setFile(null)
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

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full border rounded-xl px-4 py-3 bg-white"
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
