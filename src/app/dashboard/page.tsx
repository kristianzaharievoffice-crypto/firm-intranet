export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

interface Profile {
  id: string
  full_name: string | null
  role: string
}

interface Post {
  id: string
  content: string
  created_at: string
  employee_id: string
}

export default async function DashboardPage() {
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

  if (me.role !== 'admin') {
    redirect('/wall')
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'employee')

  const { data: posts } = await supabase
    .from('wall_posts')
    .select('id, content,