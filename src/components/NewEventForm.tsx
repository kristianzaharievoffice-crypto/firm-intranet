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
      className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-4"
      onSubmit={handleSubmit}
    >
      <div>
        <h1 className="text-2xl font-bold">Ново събитие</h1>
        <p className="text-sm text-gray-500 mt-1">
          Създай ново вътрешно събитие за екипа
        </p>
      </div>

      <input
        className="w-full border rounded-2xl px-4 py-3"
        placeholder="Събитие"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        className="w-full border rounded-2xl px-4 py-3"
        placeholder="Място"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <input
        className="w-full border rounded-2xl px-4 py-3"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <input
        className="w-full border rounded-2xl px-4 py-3"
        placeholder="Час"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <textarea
        className="w-full border rounded-2xl px-4 py-3 min-h-32"
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        type="submit"
        disabled={isSaving}
        className="bg-black text-white px-4 py-3 rounded-2xl disabled:opacity-60"
      >
        {isSaving ? 'Записване...' : 'Създай'}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}
