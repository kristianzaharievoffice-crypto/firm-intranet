'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

export default function NewDocumentForm({
  companyId,
}: {
  companyId: string
}) {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!title.trim() || !files.length) {
      setMessage(uiText.documents.enterDocument)
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

    for (const selectedFile of files) {
      const originalName = selectedFile.name || 'file'
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${companyId}/${Date.now()}_${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-documents')
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
        .from('company-documents')
        .getPublicUrl(uploadData.path)

      rows.push({
        company_id: companyId,
        title:
          files.length > 1
            ? `${title.trim()} - ${originalName}`
            : title.trim(),
        file_url: publicUrlData.publicUrl,
        file_path: uploadData.path,
        uploaded_by: user.id,
      })
    }

    const { error } = await supabase.from('company_documents').insert(rows)

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setTitle('')
    setFiles([])
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-[#ece5d8] bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
        {uiText.documents.newDocument}
      </h2>
      <p className="mt-2 text-sm text-[#7b746b]">
        {uiText.documents.newDocumentSubtitle}
      </p>

      <div className="mt-4 grid gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={uiText.documents.documentNamePlaceholder}
          className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        />

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
        />

        {files.length ? (
          <p className="text-sm text-[#7b746b]">
            Selected files: {files.map((selectedFile) => selectedFile.name).join(', ')}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[18px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? uiText.documents.uploading : uiText.documents.uploadDocument}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-[#7b746b]">{message}</p>}
    </form>
  )
}


