export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold">Събития</h1>

        {events?.map((event) => (
          <div key={event.id} className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p>📍 {event.location}</p>
            <p>📅 {event.date}</p>
            <p>⏰ {event.time}</p>
            <p className="mt-2 text-gray-600">{event.description}</p>
          </div>
        ))}
      </div>
    </main>
  )
}