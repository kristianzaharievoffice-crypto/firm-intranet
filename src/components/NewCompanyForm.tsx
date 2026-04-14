'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewCompanyForm() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!name.trim()) {
      setMessage('Напиши име на фирмата.')
      return
    }

    setIsSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Няма активен потребител.')
      setIsSaving(false)
      return
    }

    const { error } = await supabase.from('document_companies').insert({
      name: name.trim(),
      created_by: user.id,
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setName('')
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-[#ece5d8] bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-black tracking-tight text-[#1f1a14]">
        Нова фирма
      </h2>
      <p className="mt-2 text-sm text-[#7b746b]">
        Добави нова фирма към секцията Документи
      </p>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Име на фирмата"
          className="flex-1 rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        />

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[18px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? 'Записване...' : 'Добави'}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-[#7b746b]">{message}</p>}
    </form>
  )
}