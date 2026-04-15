export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import { uiText } from '@/lib/ui-text'

interface EventItem {
  id: string
  title: string
  location: string | null
  date: string | null
  time: string | null
  description: string | null
}

export default async function EventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, location, date, time, description')
    .order('date', { ascending: true })

  const items = (events ?? []) as EventItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.events.title}
        subtitle={uiText.events.subtitle}
        action={
          me?.role === 'admin' ? (
            <Link
              href="/events/new"
              className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
            >
              {uiText.events.newEvent}
            </Link>
          ) : null
        }
      />

      {items.length ? (
        <div className="space-y-5">
          {items.map((event) => (
            <div
              key={event.id}
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                {event.title}
              </h2>

              <div className="mt-4 grid gap-2 text-sm text-[#7b746b] md:grid-cols-3">
                <p>
                  <span className="font-semibold text-[#1f1a14]">{uiText.events.location}:</span>{' '}
                  {event.location || '-'}
                </p>
                <p>
                  <span className="font-semibold text-[#1f1a14]">{uiText.events.date}:</span>{' '}
                  {event.date || '-'}
                </p>
                <p>
                  <span className="font-semibold text-[#1f1a14]">{uiText.events.time}:</span>{' '}
                  {event.time || '-'}
                </p>
              </div>

              {event.description && (
                <p className="mt-4 whitespace-pre-wrap leading-7 text-[#443d35]">
                  {event.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">{uiText.events.noEvents}</p>
        </div>
      )}
    </main>
  )
}