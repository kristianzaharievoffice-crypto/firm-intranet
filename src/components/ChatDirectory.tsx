export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'

interface TaskItem {
  id: string
  title: string
  due_date: string | null
}

interface EventItem {
  id: string
  title: string
  date: string | null
  time: string | null
}

export default async function CalendarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  let tasks: TaskItem[] = []

  if (me.role === 'admin') {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  } else {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, time')
    .order('date', { ascending: true })

  const eventItems = (events ?? []) as EventItem[]

  return (
    <main className="space-y-8">
      <PageHeader
        title="Calendar"
        subtitle="📅 Your schedule with tasks and events in one place."
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            ✅ Tasks
          </h2>

          {tasks.length ? (
            <div className="mt-5 space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-[20px] bg-[#fcfbf8] p-4">
                  <p className="font-semibold text-[#1f1a14]">📝 {task.title}</p>
                  <p className="mt-2 text-sm text-[#7b746b]">
                    Due date:{' '}
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-GB')
                      : '-'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[#7b746b]">Nothing is scheduled yet.</p>
          )}
        </div>

        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            🎉 Events
          </h2>

          {eventItems.length ? (
            <div className="mt-5 space-y-4">
              {eventItems.map((event) => (
                <div key={event.id} className="rounded-[20px] bg-[#fcfbf8] p-4">
                  <p className="font-semibold text-[#1f1a14]">🎈 {event.title}</p>
                  <p className="mt-2 text-sm text-[#7b746b]">
                    Date:{' '}
                    {event.date
                      ? new Date(event.date).toLocaleDateString('en-GB')
                      : '-'}
                  </p>
                  <p className="mt-1 text-sm text-[#7b746b]">
                    ⏰ {event.time || '-'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[#7b746b]">Nothing is scheduled yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}