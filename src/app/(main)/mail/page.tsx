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

function messageTime(message: ZohoMailMessage) {
  const raw = message.receivedTime || message.sentDateInGMT
  if (!raw) return ''

  const value =
    typeof raw === 'number' || /^\d+$/.test(String(raw))
      ? Number(raw)
      : String(raw)

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('bg-BG')
}

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
        <section className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                Inbox
              </h2>
              <p className="mt-1 text-sm text-[#7b746b]">
                {emailAddress || 'Connected Zoho mailbox'}
              </p>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-[20px] bg-red-50 px-4 py-3 text-sm text-red-600">
              {loadError}
            </div>
          ) : messages.length ? (
            <div className="divide-y divide-[#ece5d8] overflow-hidden rounded-[24px] border border-[#ece5d8]">
              {messages.map((message, index) => (
                <div
                  key={message.messageId ?? `${message.subject}-${index}`}
                  className="bg-[#fcfbf8] px-5 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#1f1a14]">
                        {message.subject || '(No subject)'}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#7b746b]">
                        {message.fromAddress || message.sender || 'Unknown sender'}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-[#9a8d75]">
                      {messageTime(message)}
                    </p>
                  </div>

                  {message.summary ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5d5346]">
                      {message.summary}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-5 text-sm text-[#7b746b]">
              No emails loaded yet.
            </div>
          )}
        </section>
      )}
    </main>
  )
}


