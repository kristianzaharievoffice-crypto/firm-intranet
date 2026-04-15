'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

interface Announcement {
  id: string
  content: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export default function AdminAnnouncementForm({
  currentAnnouncement,
}: {
  currentAnnouncement: Announcement | null
}) {
  const supabase = createClient()

  const [content, setContent] = useState(currentAnnouncement?.content ?? '')
  const [expiresAt, setExpiresAt] = useState(
    currentAnnouncement?.expires_at
      ? new Date(currentAnnouncement.expires_at).toISOString().slice(0, 16)
      : ''
  )
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const saveAnnouncement = async () => {
    setMessage('')
    if (!content.trim()) {
      setMessage(uiText.announcement.enterContent)
      return
    }

    setIsSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage(uiText.common.noActiveUser)
      setIsSaving(false)
      return
    }

    if (currentAnnouncement) {
      const { error } = await supabase
        .from('site_announcements')
        .update({
          content: content.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: true,
        })
        .eq('id', currentAnnouncement.id)

      if (error) {
        setMessage(error.message)
        setIsSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('site_announcements').insert({
        content: content.trim(),
        created_by: user.id,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
      })

      if (error) {
        setMessage(error.message)
        setIsSaving(false)
        return
      }
    }

    setIsSaving(false)
    setMessage(uiText.announcement.saved)
    window.location.reload()
  }

  const removeAnnouncement = async () => {
    if (!currentAnnouncement) return

    setMessage('')
    setIsRemoving(true)

    const { error } = await supabase
      .from('site_announcements')
      .update({ is_active: false })
      .eq('id', currentAnnouncement.id)

    if (error) {
      setMessage(error.message)
      setIsRemoving(false)
      return
    }

    setIsRemoving(false)
    window.location.reload()
  }

  return (
    <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          {uiText.announcement.title}
        </h2>
        <p className="mt-2 text-sm text-[#7b746b]">
          {uiText.announcement.subtitle}
        </p>
      </div>

      <div className="grid gap-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={uiText.announcement.placeholder}
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        />

        <div className="max-w-sm">
          <label className="mb-2 block text-sm font-medium text-[#433b32]">
            {uiText.announcement.expiresAt}
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveAnnouncement}
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving
            ? uiText.announcement.saving
            : currentAnnouncement
            ? uiText.announcement.updatePin
            : uiText.announcement.savePin}
        </button>

        {currentAnnouncement && (
          <button
            type="button"
            onClick={removeAnnouncement}
            disabled={isRemoving}
            className="rounded-[20px] border border-[#e7d6a1] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8] disabled:opacity-60"
          >
            {isRemoving ? uiText.announcement.removing : uiText.announcement.removePin}
          </button>
        )}

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </div>
  )
}