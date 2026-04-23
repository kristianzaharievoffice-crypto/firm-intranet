import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JitsiCallClient from '@/components/JitsiCallClient'

export const dynamic = 'force-dynamic'

export default async function CallsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  const displayName =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'Team Member'

  const email = profile?.email || user.email || ''

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Communication
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              Calls
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Start internal audio or video meetings directly from the intranet.
              This module uses Jitsi Meet embedded inside your site, so users do
              not need a separate paid meeting platform to join a room.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            Signed in as <span className="font-semibold">{displayName}</span>
          </div>
        </div>
      </section>

      <JitsiCallClient displayName={displayName} email={email} />
    </div>
  )
}
