'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

export default function SendWallPostForm() {
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmed = content.trim()

    if (!trimmed && !file) {
      setMessage(uiText.wall.writeOrChoose)
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage(uiText.common.noActiveUser)
      setIsSaving(false)
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
        setIsSaving(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(uploadData.path)

      attachmentUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('wall_posts').insert({
      employee_id: user.id,
      content: trimmed || 'Attached file',
      attachment_url: attachmentUrl,
      status: 'pending',
      reviewed: false,
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setContent('')
    setFile(null)
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
        {uiText.wall.newPostTitle}
      </h2>

      <p className="mt-2 text-sm text-[#7b746b]">
        {uiText.wall.newPostSubtitle}
      </p>

      <div className="mt-4 grid gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={uiText.wall.placeholder}
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
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
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? uiText.wall.publishing : uiText.wall.publish}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}