export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
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

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

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
    <main className="space-y-8">
      <PageHeader
        title="Събития"
        subtitle="Вътрешни срещи, активности и всичко важно за екипа."
        action={
          me.role === 'admin' ? (
            <Link
              href="/events/new"
              className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
            >
              Ново събитие
            </Link>
          ) : null
        }
      />

      {allEvents.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {allEvents.map((event) => {
            const myResponse =
              allResponses.find(
                (r) => r.event_id === event.id && r.user_id === user.id
              )?.response ?? null

            const eventResponses = allResponses.filter((r) => r.event_id === event.id)

            return (
              <div
                key={event.id}
                className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 inline-flex rounded-full bg-[#fbf3dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a88414]">
                      {new Date(event.date).toLocaleDateString('bg-BG')}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                      {event.title}
                    </h2>

                    <div className="mt-4 space-y-2 text-sm text-[#7b746b]">
                      <p>📍 {event.location || 'Няма посочено място'}</p>
                      <p>⏰ {event.time || 'Няма посочен час'}</p>
                    </div>

                    <p className="mt-5 whitespace-pre-wrap leading-7 text-[#433b32]">
                      {event.description || 'Няма описание'}
                    </p>
                  </div>

                  {me.role === 'admin' && (
                    <form action={deleteEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button className="text-sm font-medium text-red-600 hover:underline">
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
                  <div className="mt-6 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
                    <h3 className="mb-3 text-lg font-bold text-[#1f1a14]">Отговори</h3>

                    {eventResponses.length ? (
                      <div className="space-y-2">
                        {eventResponses.map((response) => {
                          const employee = allEmployees.find(
                            (e) => e.id === response.user_id
                          )

                          return (
                            <div
                              key={`${response.event_id}-${response.user_id}`}
                              className="flex items-center justify-between rounded-[18px] border border-[#ece5d8] bg-white px-4 py-3"
                            >
                              <span className="text-sm font-medium text-[#1f1a14]">
                                {employee?.full_name ?? 'Служител'}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-semibold ${
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
                      <p className="text-sm text-[#7b746b]">Още няма отговори.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Все още няма добавени събития.</p>
        </div>
      )}
    </main>
  )
}