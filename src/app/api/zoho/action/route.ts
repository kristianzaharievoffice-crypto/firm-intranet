import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureZohoAccount,
  getZohoConnection,
  refreshZohoAccessToken,
  zohoMailBaseFromLocation,
} from '@/lib/zoho-mail'

export const dynamic = 'force-dynamic'

type MailAction = 'markRead' | 'markUnread' | 'important' | 'unflag' | 'delete'

type ActionBody = {
  action?: MailAction
  messageId?: string
  folderId?: string
}

function zohoMode(action: MailAction) {
  switch (action) {
    case 'markRead':
      return { mode: 'markAsRead' }
    case 'markUnread':
      return { mode: 'markAsUnread' }
    case 'important':
      return { mode: 'setFlag', flagid: 'important' }
    case 'unflag':
      return { mode: 'setFlag', flagid: 'flag_not_set' }
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const body = (await request.json()) as ActionBody
  const action = body.action

  if (!action || !body.messageId) {
    return NextResponse.json(
      { error: 'Action and message id are required.' },
      { status: 400 }
    )
  }

  if ((action === 'delete' || action === 'important' || action === 'unflag') && !body.folderId) {
    return NextResponse.json({ error: 'Folder id is required.' }, { status: 400 })
  }

  const connection = await getZohoConnection(user.id)

  if (!connection) {
    return NextResponse.json({ error: 'Zoho is not connected.' }, { status: 400 })
  }

  const readyConnection = await ensureZohoAccount(connection)
  const accessToken = await refreshZohoAccessToken(readyConnection)
  const mailBase = readyConnection.mail_api_base || zohoMailBaseFromLocation(null)

  if (!readyConnection.account_id) {
    return NextResponse.json({ error: 'Zoho account was not found.' }, { status: 400 })
  }

  const endpoint =
    action === 'delete'
      ? `${mailBase}/api/accounts/${readyConnection.account_id}/folders/${body.folderId}/messages/${body.messageId}`
      : `${mailBase}/api/accounts/${readyConnection.account_id}/updatemessage`

  const payload = zohoMode(action)
  const response = await fetch(endpoint, {
    method: action === 'delete' ? 'DELETE' : 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    body: action === 'delete'
      ? undefined
      : JSON.stringify({
          ...payload,
          messageId: [body.messageId],
          folderId: body.folderId,
          isFolderSpecific: Boolean(body.folderId),
        }),
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
          `Zoho action failed with status ${response.status}.`,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({ ok: true })
}
