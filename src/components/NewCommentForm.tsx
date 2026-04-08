'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewCommentForm({ postId }: { postId: string }) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmed = content.trim()

    if (!trimmed) {
      setMessage('Напиши коментар.')
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Няма активен потребител.')
      setIsSaving(false)
      return
    }

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: trimmed,
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setContent('')
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Напиши коментар..."
        className="w-full min-h-24 border rounded-2xl px-4 py-3 bg-white"
      />

      <button
        type="submit"
        disabled={isSaving}
        className="bg-[#d4af37] hover:bg-[#b8962e] text-white px-4 py-2 rounded-2xl disabled:opacity-60"
      >
        {isSaving ? 'Записване...' : 'Добави коментар'}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}