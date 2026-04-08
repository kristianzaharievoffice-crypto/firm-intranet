'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewEventForm() {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!title.trim() || !date) {
      setMessage('Попълни поне събитие и дата.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase.rpc('create_event_with_notifications', {
      event_title: title.trim(),
      event_location: location.trim(),
      event_date: date,
      event_time: time.trim(),
      event_description: description.trim(),
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    window.location.href = '/events'
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#1f1a14]">
          Ново събитие
        </h1>
        <p className="mt-2 text-sm text-[#7b746b]">
          Създай красиво и подредено вътрешно събитие за екипа
        </p>
      </div>

      <div className="grid gap-4">
        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Събитие"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Място"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="date"
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <input
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            placeholder="Час"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <textarea
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? 'Записване...' : 'Създай'}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}