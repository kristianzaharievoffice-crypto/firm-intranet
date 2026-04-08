export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface EventItem {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  description: string | null
}

interface TaskItem {
  id: string
  title: string
  due_date: string | null
  priority: string
  status: string
  assigned_to: string
}

type CalendarEntry = {
  type: 'event' | 'task'
  id: string
  title: string
  date: string
  time?: string | null
  location?: string | null
  description?: string | null
  priority?: string
  status?: string
}

function getPriorityLabel(priority?: string) {
  switch (priority) {
    case 'high':
      return 'Висок'
    case 'low':
      return 'Нисък'
    case 'medium':
      return 'Среден'
    default:
      return ''
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case 'done':
      return 'Готова'
    case 'in_progress':
      return 'В процес'
    case 'new':
      return 'Нова'
    default:
      return ''
  }
}

export default async function CalendarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) {
    redirect('/login')
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, time, location, description')
    .gte('date', today)
    .order('date', { ascending: true })

  let tasks: TaskItem[] = []

  if (me.role === 'admin') {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, assigned_to')
      .not('due_date', 'is', null)
      .gte('due_date', today)
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  } else {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, assigned_to')
      .eq('assigned_to', user.id)
      .not('due_date', 'is', null)
      .gte('due_date', today)
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  }

  const upcomingEvents = (events ?? []) as EventItem[]
  const upcomingTasks = tasks

  const calendarItems: CalendarEntry[] = [
    ...upcomingEvents.map((event) => ({
      type: 'event' as const,
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
    })),
    ...upcomingTasks.map((task) => ({
      type: 'task' as const,
      id: task.id,
      title: task.title,
      date: task.due_date as string,
      priority: task.priority,
      status: task.status,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Календар</h1>
        <p className="text-gray-500 mt-2">
          Предстоящи събития и крайни срокове по задачи
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold mb-4">Предстоящи събития</h2>

          {upcomingEvents.length ? (
            <div className="space-y-4">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-100 rounded-3xl p-5 bg-[#fafafa]"
                >
                  <h3 className="text-lg font-bold">{event.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(event.date).toLocaleDateString('bg-BG')}
                    {event.time ? ` • ${event.time}` : ''}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {event.location || 'Без място'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Няма предстоящи събития.</p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold mb-4">Предстоящи задачи</h2>

          {upcomingTasks.length ? (
            <div className="space-y-4">
              {upcomingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-100 rounded-3xl p-5 bg-[#fafafa]"
                >
                  <h3 className="text-lg font-bold">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Срок: {task.due_date ? new Date(task.due_date).toLocaleDateString('bg-BG') : 'Няма'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Приоритет: {getPriorityLabel(task.priority)} • Статус: {getStatusLabel(task.status)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Няма предстоящи задачи.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold mb-4">График по дати</h2>

        {calendarItems.length ? (
          <div className="space-y-4">
            {calendarItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="border border-gray-100 rounded-3xl p-5 bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      item.type === 'event'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.type === 'event' ? 'Събитие' : 'Задача'}
                  </span>

                  <p className="text-sm text-gray-500">
                    {new Date(item.date).toLocaleDateString('bg-BG')}
                  </p>
                </div>

                <h3 className="text-lg font-bold text-[#1f2937]">{item.title}</h3>

                {item.type === 'event' ? (
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>{item.time ? `Час: ${item.time}` : 'Без час'}</p>
                    <p>{item.location ? `Място: ${item.location}` : 'Без място'}</p>
                    {item.description && <p>{item.description}</p>}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>Приоритет: {getPriorityLabel(item.priority)}</p>
                    <p>Статус: {getStatusLabel(item.status)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Няма елементи в графика.</p>
        )}
      </div>
    </main>
  )
}