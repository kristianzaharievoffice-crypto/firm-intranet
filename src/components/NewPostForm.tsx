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
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('post-files')
        .upload(filePath, file)

      if (uploadError) {
        setMessage(uploadError.message)
        setIsSubmitting(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(filePath)

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
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 space-y-5 border border-gray-100">
      <div>
        <h2 className="text-2xl font-bold">Нов проект / отчет</h2>
        <p className="text-sm text-gray-500 mt-1">
          Добави какво си свършил и избери текущ статус.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Описание</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Например: Завърших дизайна на началната страница и подготвих чат модула..."
          className="w-full min-h-36 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Статус</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black bg-white"
        >
          <option value="в процес">В процес</option>
          <option value="за проверка">За проверка</option>
          <option value="готово">Готово</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Файл</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full border rounded-2xl px-4 py-3 bg-white"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-black text-white px-5 py-3 rounded-2xl disabled:opacity-60"
      >
        {isSubmitting ? 'Записване...' : 'Добави'}
      </button>

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  )
}
