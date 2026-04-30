export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import {
  fetchZohoInbox,
  getZohoConnection,
  type ZohoMailMessage,
} from '@/lib/zoho-mail'
import ZohoMailClient from '@/components/ZohoMailClient'

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const connection = await getZohoConnection(user.id)
  let messages: ZohoMailMessage[] = []
  let emailAddress = connection?.email_address ?? null
  let loadError = ''

  if (connection) {
    try {
      const inbox = await fetchZohoInbox(connection)
      messages = inbox.messages
      emailAddress = inbox.connection.email_address ?? emailAddress
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : 'Could not load Zoho inbox.'
    }
  }

  return (
    <main className="space-y-8">
      <PageHeader
        title="Mail"
        subtitle="Zoho Mail inbox inside the intranet."
        action={
          connection ? (
            <Link
              href="/api/zoho/connect"
              className="rounded-[20px] bg-[#f3efe8] px-5 py-3 font-semibold text-[#5d5346] hover:bg-[#ebe2d4]"
            >
              Reconnect Zoho
            </Link>
          ) : null
        }
      />

      {params.error ? (
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          Zoho connection error: {params.error}
        </div>
      ) : null}

      {!connection ? (
        <section className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            Connect Zoho Mail
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b746b]">
            Connect your Zoho account to read your mailbox here. The site uses
            OAuth, so your Zoho password is never stored.
          </p>

          <Link
            href="/api/zoho/connect"
            className="mt-5 inline-flex rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
          >
            Connect Zoho
          </Link>
        </section>
      ) : (
        <>
          {loadError ? (
            <div className="rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {loadError}
            </div>
          ) : (
            <ZohoMailClient messages={messages} emailAddress={emailAddress} />
          )}
        </>
      )}
    </main>
  )
}
