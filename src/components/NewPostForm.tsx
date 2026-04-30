'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

export default function NewFeedPostForm({
  onPosted,
}: {
  onPosted?: () => void
}) {
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const trimmed = content.trim()

    if (!trimmed && !files.length) {
      setMessage(uiText.feed.writeOrChoose)
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

    const rows = []

    if (!files.length) {
      rows.push({
        user_id: user.id,
        content: trimmed,
        attachment_url: null,
        attachment_path: null,
      })
    }

    for (const selectedFile of files) {
      const originalName = selectedFile.name || 'file'
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('feed-files')
        .upload(filePath, selectedFile, {
          upsert: false,
          contentType: selectedFile.type || undefined,
        })

      if (uploadError) {
        setMessage(`Upload error: ${uploadError.message}`)
        setIsSaving(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('feed-files')
        .getPublicUrl(uploadData.path)

      rows.push({
        user_id: user.id,
        content: trimmed || `${uiText.feed.attachedFile}: ${originalName}`,
        attachment_url: publicUrlData.publicUrl,
        attachment_path: uploadData.path,
      })
    }

    const { error } = await supabase.from('feed_posts').insert(rows)

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setContent('')
    setFiles([])
    setMessage('')
    setIsSaving(false)
    onPosted?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
        {uiText.feed.newPostTitle}
      </h2>

      <p className="mt-2 text-sm text-[#7b746b]">
        {uiText.feed.newPostSubtitle}
      </p>

      <div className="mt-4 grid gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={uiText.feed.placeholder}
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        />

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
        />

        {files.length ? (
          <p className="text-sm text-[#7b746b]">
            Selected files: {files.map((selectedFile) => selectedFile.name).join(', ')}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? uiText.feed.publishing : uiText.feed.publish}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}


