'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewPostForm() {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('в процес')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setMessage('Моля, опиши какво е свършено.')
      return
    }

    setIsSubmitting(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Няма активен потребител.')
      setIsSubmitting(false)
      return
    }

    let attachmentUrl: string | null = null

    if (file) {
      const originalName = file.name || 'file'
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        setMessage(`Upload error: ${uploadError.message}`)
        setIsSubmitting(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(uploadData.path)

      attachmentUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('wall_posts').insert({
      employee_id: user.id,
      content: trimmedContent,
      status,
      attachment_url: attachmentUrl,
    })

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setContent('')
    setStatus('в процес')
    setFile(null)
    setMessage('Проектът е добавен успешно.')
    setIsSubmitting(false)
    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          Нов проект / отчет
        </h2>
        <p className="mt-2 text-sm text-[#7b746b]">
          Добави какво си свършил, статус и файл при нужда.
        </p>
      </div>

      <div className="grid gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Например: Завърших дизайна на началната страница и качих новите файлове..."
          className="min-h-36 w-full rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-4 text-[#1f1a14] outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#f5e7b6]"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-[#1f1a14] outline-none focus:border-[#c9a227]"
          >
            <option value="в процес">В процес</option>
            <option value="за проверка">За проверка</option>
            <option value="готово">Готово</option>
          </select>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-[#1f1a14]"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[20px] bg-[#c9a227] px-6 py-3 font-semibold text-white transition hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSubmitting ? 'Записване...' : 'Добави'}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}