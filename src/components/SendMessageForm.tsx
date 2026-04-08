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

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        setMessage(`Upload error: ${uploadError.message}`)
        setIsSending(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(uploadData.path)

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
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-2xl font-black tracking-tight text-[#1f1a14]">
        Ново съобщение
      </h2>

      <div className="grid gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Напиши съобщение..."
          className="min-h-28 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSending}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSending ? 'Изпращане...' : 'Изпрати'}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}