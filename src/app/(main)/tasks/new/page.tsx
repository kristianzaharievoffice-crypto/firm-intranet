import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewTaskForm from '@/components/NewTaskForm'

interface Employee {
  id: string
  full_name: string | null
}

export default async function NewTaskPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true })

  return <NewTaskForm employees={(employees ?? []) as Employee[]} />
}


