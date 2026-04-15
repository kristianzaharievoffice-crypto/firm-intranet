'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

export default function NewPammForm() {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!title.trim()) {
      setMessage(uiText.pamm.enterTitle)
      return
    }

    if (!amount || Number.isNaN(Number(amount))) {
      setMessage(uiText.pamm.enterAmount)
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

    const { error } = await supabase.from('pamm_items').insert({
      title: title.trim(),
      description: description.trim() || null,
      amount: Number(amount),
      currency,
      created_by: user.id,
      created_at: new Date().toISOString(),
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    window.location.href = '/pamm'
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#1f1a14]">
          {uiText.pamm.newItemTitle}
        </h1>
        <p className="mt-2 text-sm text-[#7b746b]">
          {uiText.pamm.newItemSubtitle}
        </p>
      </div>

      <div className="grid gap-4">
        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder={uiText.pamm.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder={uiText.pamm.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="number"
            step="0.01"
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            placeholder={uiText.pamm.amountPlaceholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <select
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR')}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? uiText.pamm.saving : uiText.pamm.create}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}