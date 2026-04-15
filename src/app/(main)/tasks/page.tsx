export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import TaskList from '@/components/TaskList'
import { uiText } from '@/lib/ui-text'

interface TaskItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  assigned_to: string
  created_by: string
}

interface ProfileItem {
  id: string
  full_name: string | null
}

async function updateTaskStatus(formData: FormData) {
  'use server'

  const taskId = formData.get('taskId') as string
  const status = formData.get('status') as string
  const supabase = await createClient()

  await supabase.from('tasks').update({ status }).eq('id', taskId)

  revalidatePath('/tasks')
}

async function deleteTask(formData: FormData) {
  'use server'

  const taskId = formData.get('taskId') as string
  const supabase = await createClient()

  await supabase.from('tasks').delete().eq('id', taskId)

  revalidatePath('/tasks')
}

export default async function TasksPage() {
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
      .select('id, title, description, due_date, priority, status, assigned_to, created_by')
      .order('created_at', { ascending: false })

    tasks = (data ?? []) as TaskItem[]
  } else {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, priority, status, assigned_to, created_by')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })

    tasks = (data ?? []) as TaskItem[]
  }

  const employeeIds = [...new Set(tasks.map((t) => t.assigned_to))]
  const safeEmployeeIds = employeeIds.length
    ? employeeIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeEmployeeIds)

  const people = (employees ?? []) as ProfileItem[]
  const nameMap = new Map(people.map((p) => [p.id, p.full_name ?? uiText.common.user]))

  const enrichedTasks = tasks.map((task) => ({
    ...task,
    employee_name: nameMap.get(task.assigned_to) ?? uiText.common.user,
  }))

  const total = enrichedTasks.length
  const totalNew = enrichedTasks.filter((t) => t.status === 'new').length
  const totalInProgress = enrichedTasks.filter((t) => t.status === 'in_progress').length
  const totalDone = enrichedTasks.filter((t) => t.status === 'done').length

  return (
    <main className="space-y-8">
      <PageHeader
        title={uiText.tasks.title}
        subtitle={uiText.tasks.subtitle}
        action={
          me.role === 'admin' ? (
            <Link
              href="/tasks/new"
              className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
            >
              {uiText.tasks.newTask}
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={uiText.tasks.total} value={total} />
        <StatCard label={uiText.tasks.new} value={totalNew} />
        <StatCard label={uiText.tasks.inProgress} value={totalInProgress} tone="soft" />
        <StatCard label={uiText.tasks.done} value={totalDone} tone="gold" />
      </div>

      <TaskList
        tasks={enrichedTasks}
        isAdmin={me.role === 'admin'}
        updateStatusAction={updateTaskStatus}
        deleteTaskAction={deleteTask}
      />
    </main>
  )
}