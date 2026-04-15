import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewPammForm from '@/components/NewPammForm'

export default async function NewPammPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <NewPammForm />
}