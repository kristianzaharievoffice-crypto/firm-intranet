import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureZohoAccount,
  getZohoConnection,
  refreshZohoAccessToken,
  zohoMailBaseFromLocation,
} from '@/lib/zoho-mail'

export const dynamic = 'force-dynamic'

type SendBody = {
  mode?: 'compose' | 'reply'
  messageId?: string
  toAddress?: string
  ccAddress?: string
  bccAddress?: string
  subject?: string
  content?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const connection = await getZohoConnection(user.id)

  if (!connection) {
    return NextResponse.json({ error: 'Zoho is not connected.' }, { status: 400 })
  }

  const body = (await request.json()) as SendBody
  const mode = body.mode === 'reply' ? 'reply' : 'compose'
  const content = body.content?.trim()
  const subject = body.subject?.trim()
  const toAddress = body.toAddress?.trim()

  if (!content) {
    return NextResponse.json({ error: 'Message content is required.' }, { status: 400 })
  }

  if (mode === 'compose' && (!toAddress || !subject)) {
    return NextResponse.json(
      { error: 'To and subject are required.' },
      { status: 400 }
    )
  }

  if (mode === 'reply' && !body.messageId) {
    return NextResponse.json({ error: 'Message id is required.' }, { status: 400 })
  }

  const readyConnection = await ensureZohoAccount(connection)
  const accessToken = await refreshZohoAccessToken(readyConnection)
  const mailBase = readyConnection.mail_api_base || zohoMailBaseFromLocation(null)
  const fromAddress = readyConnection.email_address

  if (!readyConnection.account_id || !fromAddress) {
    return NextResponse.json(
      { error: 'Zoho account email was not found.' },
      { status: 400 }
    )
  }

  const endpoint =
    mode === 'reply'
      ? `${mailBase}/api/accounts/${readyConnection.account_id}/messages/${body.messageId}`
      : `${mailBase}/api/accounts/${readyConnection.account_id}/messages`

  const payload =
    mode === 'reply'
      ? {
          fromAddress,
          toAddress: toAddress || undefined,
          ccAddress: body.ccAddress?.trim() || undefined,
          bccAddress: body.bccAddress?.trim() || undefined,
          subject: subject || undefined,
          content,
          action: 'reply',
          mailFormat: 'plaintext',
        }
      : {
          fromAddress,
          toAddress,
          ccAddress: body.ccAddress?.trim() || undefined,
          bccAddress: body.bccAddress?.trim() || undefined,
          subject,
          content,
          mailFormat: 'plaintext',
        }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({}))) as {
    status?: { description?: string }
    error?: string
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data.error ||
          data.status?.description ||
          `Zoho send failed with status ${response.status}.`,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({ ok: true })
}
