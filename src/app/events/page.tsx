export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface EventItem {
  id: string
  title: string
  location: string | null
  date: string
  time: string | null
  description: string | null
  created_at: string
}

export default async function EventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) {
    redirect('/login')
  }

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  const allEvents = (events ?? []) as EventItem[]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Събития</h1>
            <p className="text-gray-500 mt-2">
              Вътрешни срещи, събития и важни обяви
            </p>
          </div>

          {me.role === 'admin' && (
            <Link
              href="/events/new"
              className="bg-black text-white px-4 py-3 rounded-2xl"
            >
              Ново събитие
            </Link>
          )}
        </div>

        {allEvents.length ? (
          <div className="space-y-4">
            {allEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100"
              >
                <h2 className="text-2xl font-bold">{event.title}</h2>

                <div className="mt-3 space-y-1 text-gray-700">
                  <p>📍 {event.location || 'Няма посочено място'}</p>
                  <p>📅 {new Date(event.date).toLocaleDateString('bg-BG')}</p>
                  <p>⏰ {event.time || 'Няма посочен час'}</p>
                </div>

                <p className="mt-4 text-gray-600 whitespace-pre-wrap">
                  {event.description || 'Няма описание'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
            <p className="text-gray-500">Все още няма добавени събития.</p>
          </div>
        )}
      </div>
    </main>
  )
}