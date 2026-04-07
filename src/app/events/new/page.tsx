'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

export default function NewEventPage() {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    await supabase.from('events').insert({
      title,
      location,
      date,
      time,
      description,
    })

    window.location.href = '/events'
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl space-y-4">
          <h1 className="text-xl font-bold">Ново събитие</h1>

          <input placeholder="Събитие" onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Място" onChange={(e) => setLocation(e.target.value)} />
          <input type="date" onChange={(e) => setDate(e.target.value)} />
          <input placeholder="Час" onChange={(e) => setTime(e.target.value)} />
          <textarea placeholder="Описание" onChange={(e) => setDescription(e.target.value)} />

          <button className="bg-black text-white px-4 py-2 rounded">
            Създай
          </button>
        </form>
      </div>
    </main>
  )
}