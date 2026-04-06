import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  async function signOut() {
    'use server'

    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-lg">Фирмена мрежа</p>
          <p className="text-sm text-gray-500">
            {profile?.full_name || user.email} | {profile?.role || 'employee'}
          </p>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/wall" className="hover:underline">
            Стена
          </Link>

          <Link href="/chat" className="hover:underline">
            Чат
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          )}

          <form action={signOut}>
            <button type="submit" className="hover:underline">
              Изход
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}