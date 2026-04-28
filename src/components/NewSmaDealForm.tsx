'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CURRENCIES = ['GBP', 'USD', 'EUR'] as const

type Currency = (typeof CURRENCIES)[number]

export default function NewSmaDealForm() {
  const supabase = createClient()

  const [client, setClient] = useState('')
  const [stageAmount, setStageAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [targetProfit, setTargetProfit] = useState('')
  const [maxDrawdown, setMaxDrawdown] = useState('')
  const [period, setPeriod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [hardStopOut, setHardStopOut] = useState(false)
  const [comments, setComments] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setClient('')
    setStageAmount('')
    setCurrency('GBP')
    setTargetProfit('')
    setMaxDrawdown('')
    setPeriod('')
    setStartDate('')
    setHardStopOut(false)
    setComments('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!client.trim()) {
      setMessage('Please enter a client.')
      return
    }

    if (!stageAmount || Number.isNaN(Number(stageAmount))) {
      setMessage('Please enter a valid stage amount.')
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

    const { error } = await supabase.from('sma_deals').insert({
      client: client.trim(),
      stage_amount: Number(stageAmount),
      currency,
      target_profit: targetProfit.trim() || null,
      max_drawdown: maxDrawdown.trim() || null,
      period: period.trim() || null,
      start_date: startDate || null,
      hard_stop_out: hardStopOut,
      comments: comments.trim() || null,
      status: 'active',
      created_by: user.id,
      updated_by: user.id,
    })

    setIsSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    resetForm()
    setMessage('SMA deal created.')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
          New SMA deal
        </h2>
        <p className="mt-2 text-sm text-[#7b746b]">
          Add a client deal with stage, target, drawdown and period details.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />

        <input
          type="number"
          step="0.01"
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Stage amount"
          value={stageAmount}
          onChange={(e) => setStageAmount(e.target.value)}
        />

        <select
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
        >
          {CURRENCIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Target profit, e.g. 200K PNL"
          value={targetProfit}
          onChange={(e) => setTargetProfit(e.target.value)}
        />

        <input
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Max drawdown, e.g. 10%"
          value={maxDrawdown}
          onChange={(e) => setMaxDrawdown(e.target.value)}
        />

        <input
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Period, e.g. No Limit"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />

        <input
          type="date"
          className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <label className="flex items-center gap-3 rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm font-medium text-[#5d5346]">
          <input
            type="checkbox"
            checked={hardStopOut}
            onChange={(e) => setHardStopOut(e.target.checked)}
          />
          Hard stop out
        </label>
      </div>

      <textarea
        className="mt-4 min-h-[110px] w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
        placeholder="Comments"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Create SMA deal'}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}


