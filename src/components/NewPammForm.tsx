'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PammSection = 'pamm' | 'mt5' | 'fund'

type NewPammFormProps = {
  section?: PammSection
  sectionLabel?: string
  redirectTo?: string
}

function pammNotificationTitle(sectionLabel: string) {
  return `New ${sectionLabel} item`
}

export default function NewPammForm({
  section = 'pamm',
  sectionLabel = 'PAMM',
  redirectTo = '/pamm',
}: NewPammFormProps) {
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
      setMessage('Please enter a title.')
      return
    }

    if (!amount || Number.isNaN(Number(amount))) {
      setMessage('Please enter a valid amount.')
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('No active user.')
      setIsSaving(false)
      return
    }

    const trimmedTitle = title.trim()
    const notificationStartedAt = new Date(Date.now() - 5000).toISOString()

    const { error } = await supabase.from('pamm_items').insert({
      section,
      title: trimmedTitle,
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

    await supabase
      .from('notifications')
      .update({
        title: pammNotificationTitle(sectionLabel),
        link: redirectTo,
      })
      .eq('title', 'New PAMM item')
      .gte('created_at', notificationStartedAt)

    window.location.href = redirectTo
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          New {sectionLabel} item
        </h2>

        <p className="mt-2 text-sm text-[#7b746b]">
          Create a shared {sectionLabel} item visible to everyone.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-[120px] w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="number"
            step="0.01"
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            placeholder="Amount"
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
          {isSaving ? 'Saving...' : `Create ${sectionLabel} item`}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}


