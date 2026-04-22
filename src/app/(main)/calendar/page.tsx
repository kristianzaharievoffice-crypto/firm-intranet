export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarWorkspace from '@/components/CalendarWorkspace'

type TaskItem = {
  id: string
  title: string
  due_date: string | null
  assigned_to: string | null
}

type EventItem = {
  id: string
  title: string
  date: string | null
  time: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type PlannerItem = {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_done: boolean
  created_at?: string | null
  updated_at?: string | null
}

export default async function CalendarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  let tasks: TaskItem[] = []

  if (me.role === 'admin') {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, assigned_to')
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  } else {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, assigned_to')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true })

    tasks = (data ?? []) as TaskItem[]
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, date, time')
    .order('date', { ascending: true })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true })

  const { data: plannerItems } = await supabase
    .from('personal_calendar_items')
    .select('id, user_id, title, description, start_at, end_at, is_done, created_at, updated_at')
    .order('start_at', { ascending: true })

  return (
    <CalendarWorkspace
      currentUserId={user.id}
      currentUserRole={me.role}
      profiles={(profiles ?? []) as ProfileRow[]}
      internalTasks={tasks}
      internalEvents={(events ?? []) as EventItem[]}
      initialPlannerItems={(plannerItems ?? []) as PlannerItem[]}
    />
  )
}