'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

export default function NewEventPage() {
  const supabase = createClient()
  const router = useRouter()

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

    if (!title.trim() || !date || !time) {
      setMessage(uiText.events.fillRequired)
      return
    }

    setIsSaving(true)

    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      location: location.trim() || null,
      date,
      time,
      description: description.trim() || null,
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    router.push('/events')
  }

  return (
    <main className="space-y-8">
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#1f1a14]">
            {uiText.events.newEventTitle}
          </h1>
          <p className="mt-2 text-sm text-[#7b746b]">
            {uiText.events.newEventSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={uiText.events.titleField}
            className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={uiText.events.locationField}
            className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            />

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={uiText.events.descriptionField}
            className="min-h-32 rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
            >
              {isSaving ? uiText.events.creating : uiText.events.createEvent}
            </button>

            {message && <p className="text-sm text-[#7b746b]">{message}</p>}
          </div>
        </form>
      </div>
    </main>
  )
}