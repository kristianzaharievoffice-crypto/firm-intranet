'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EditPostForm({
  postId,
  initialContent,
  initialStatus,
}: {
  postId: string
  initialContent: string
  initialStatus: string
}) {
  const supabase = createClient()
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState(initialStatus)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setMessage('Съдържанието не може да е празно.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase
      .from('wall_posts')
      .update({
        content: trimmedContent,
        status,
      })
      .eq('id', postId)

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    window.location.href = '/wall'
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 space-y-4"
    >
      <div>
        <h1 className="text-2xl font-bold">Редакция на пост</h1>
        <p className="text-sm text-gray-500 mt-1">
          Промени текста и статуса на проекта
        </p>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-36 border rounded-2xl px-4 py-3"
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full border rounded-2xl px-4 py-3 bg-white"
      >
        <option value="в процес">В процес</option>
        <option value="за проверка">За проверка</option>
        <option value="готово">Готово</option>
      </select>

      <button
        type="submit"
        disabled={isSaving}
        className="bg-black text-white px-4 py-3 rounded-2xl disabled:opacity-60"
      >
        {isSaving ? 'Записване...' : 'Запази промените'}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}
