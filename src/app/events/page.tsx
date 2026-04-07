export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import EventResponseForm from '@/components/EventResponseForm'

interface EventItem {
  id: string
  title: string
  location: string | null
  date: string
  time: string | null
  description: string | null
  created_at: string
}

interface ResponseItem {
  event_id: string
  user_id: string
  response: 'yes' | 'no'
}

interface ProfileItem {
  id: string
  full_name: string | null
}

async function deleteEvent(formData: FormData) {
  'use server'

  const eventId = formData.get('eventId') as string
  const supabase = await createClient()

  await supabase.from('events').delete().eq('id', eventId)

  revalidatePath('/events')
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

  const { data: responses } = await supabase
    .from('event_responses')
    .select('event_id, user_id, response')

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'employee')

  const allEvents = (events ?? []) as EventItem[]
  const allResponses = (responses ?? []) as ResponseItem[]
  const allEmployees = (employees ?? []) as ProfileItem[]

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
            {allEvents.map((event) => {
              const myResponse =
                allResponses.find(
                  (r) => r.event_id === event.id && r.user_id === user.id
                )?.response ?? null

              const eventResponses = allResponses.filter((r) => r.event_id === event.id)

              return (
                <div
                  key={event.id}
                  className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
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

                    {me.role === 'admin' && (
                      <form action={deleteEvent}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button className="text-sm text-red-600 hover:underline">
                          Изтрий
                        </button>
                      </form>
                    )}
                  </div>

                  {me.role === 'employee' && (
                    <EventResponseForm
                      eventId={event.id}
                      initialResponse={myResponse}
                      userId={user.id}
                    />
                  )}

                  {me.role === 'admin' && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="font-semibold mb-3">Отговори</h3>

                      {eventResponses.length ? (
                        <div className="space-y-2">
                          {eventResponses.map((response) => {
                            const employee = allEmployees.find(
                              (e) => e.id === response.user_id
                            )

                            return (
                              <div
                                key={`${response.event_id}-${response.user_id}`}
                                className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3"
                              >
                                <span>{employee?.full_name ?? 'Служител'}</span>

                                <span
                                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                                    response.response === 'yes'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {response.response === 'yes'
                                    ? 'Ще присъства'
                                    : 'Няма да присъства'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500">Още няма отговори.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
