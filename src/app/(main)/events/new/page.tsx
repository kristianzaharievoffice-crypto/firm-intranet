import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewEventForm from '@/components/NewEventForm'

export default async function NewEventPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'admin') {
    redirect('/events')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="max-w-xl mx-auto p-6">
        <NewEventForm />
      </div>
    </main>
  )
}