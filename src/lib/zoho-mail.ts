import { createClient } from '@/lib/supabase/server'

type ZohoConnection = {
  user_id: string
  access_token: string | null
  refresh_token: string
  expires_at: string | null
  accounts_server: string | null
  mail_api_base: string | null
  account_id: string | null
  email_address: string | null
}

type ZohoTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  api_domain?: string
  error?: string
}

type ZohoAccount = {
  accountId?: string
  primaryEmailAddress?: string
  mailboxAddress?: string
}

export type ZohoMailFolder = {
  folderId?: string
  folderName?: string
  folderType?: string
  path?: string
}

export type ZohoMailMessage = {
  messageId?: string
  folderId?: string
  threadId?: string
  summary?: string
  subject?: string
  fromAddress?: string
  toAddress?: string
  ccAddress?: string
  sender?: string
  receivedTime?: string | number
  sentDateInGMT?: string
  status2?: string
  flagid?: string
  hasAttachment?: string | number | boolean
}

export type ZohoMailContent = {
  messageId?: string | number
  content?: string
}

export function zohoRedirectUri(origin: string) {
  return `${origin}/api/zoho/callback`
}

export function zohoAccountsServer() {
  return process.env.ZOHO_ACCOUNTS_SERVER || 'https://accounts.zoho.com'
}

export function zohoMailBaseFromLocation(location: string | null) {
  switch ((location ?? '').toLowerCase()) {
    case 'eu':
      return 'https://mail.zoho.eu'
    case 'in':
      return 'https://mail.zoho.in'
    case 'au':
      return 'https://mail.zoho.com.au'
    case 'jp':
      return 'https://mail.zoho.jp'
    case 'ca':
      return 'https://mail.zohocloud.ca'
    case 'cn':
      return 'https://mail.zoho.com.cn'
    case 'ae':
      return 'https://mail.zoho.ae'
    case 'sa':
      return 'https://mail.zoho.sa'
    default:
      return process.env.ZOHO_MAIL_API_BASE || 'https://mail.zoho.com'
  }
}

function expiresAt(expiresInSeconds: number | undefined) {
  const seconds = expiresInSeconds ?? 3600
  return new Date(Date.now() + Math.max(seconds - 120, 60) * 1000).toISOString()
}

function isExpired(value: string | null) {
  if (!value) return true
  return new Date(value).getTime() <= Date.now()
}

export async function getZohoConnection(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('zoho_mail_connections')
    .select(
      'user_id, access_token, refresh_token, expires_at, accounts_server, mail_api_base, account_id, email_address'
    )
    .eq('user_id', userId)
    .maybeSingle()

  return (data ?? null) as ZohoConnection | null
}

export async function refreshZohoAccessToken(connection: ZohoConnection) {
  if (connection.access_token && !isExpired(connection.expires_at)) {
    return connection.access_token
  }

  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET.')
  }

  const tokenUrl = new URL(
    `${connection.accounts_server || zohoAccountsServer()}/oauth/v2/token`
  )
  tokenUrl.searchParams.set('refresh_token', connection.refresh_token)
  tokenUrl.searchParams.set('grant_type', 'refresh_token')
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('client_secret', clientSecret)

  const response = await fetch(tokenUrl.toString(), {
    method: 'POST',
    cache: 'no-store',
  })
  const tokenData = (await response.json()) as ZohoTokenResponse

  if (!response.ok || !tokenData.access_token) {
    throw new Error(tokenData.error || 'Could not refresh Zoho token.')
  }

  const supabase = await createClient()
  await supabase
    .from('zoho_mail_connections')
    .update({
      access_token: tokenData.access_token,
      expires_at: expiresAt(tokenData.expires_in),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  return tokenData.access_token
}

export async function fetchZohoAccounts(connection: ZohoConnection) {
  const accessToken = await refreshZohoAccessToken(connection)
  const mailBase = connection.mail_api_base || zohoMailBaseFromLocation(null)

  const response = await fetch(`${mailBase}/api/accounts`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    cache: 'no-store',
  })

  const json = (await response.json()) as { data?: ZohoAccount[]; error?: unknown }

  if (!response.ok) {
    throw new Error('Could not load Zoho accounts.')
  }

  return json.data ?? []
}

export async function ensureZohoAccount(connection: ZohoConnection) {
  if (connection.account_id) return connection

  const accounts = await fetchZohoAccounts(connection)
  const account = accounts[0]

  if (!account?.accountId) {
    throw new Error('No Zoho Mail account found for this user.')
  }

  const email = account.primaryEmailAddress || account.mailboxAddress || null
  const supabase = await createClient()

  await supabase
    .from('zoho_mail_connections')
    .update({
      account_id: account.accountId,
      email_address: email,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  return {
    ...connection,
    account_id: account.accountId,
    email_address: email,
  }
}

export async function fetchZohoInbox(connection: ZohoConnection) {
  return fetchZohoMessages(connection)
}

export async function fetchZohoFolders(connection: ZohoConnection) {
  const readyConnection = await ensureZohoAccount(connection)
  const accessToken = await refreshZohoAccessToken(readyConnection)
  const mailBase = readyConnection.mail_api_base || zohoMailBaseFromLocation(null)

  const response = await fetch(
    `${mailBase}/api/accounts/${readyConnection.account_id}/folders`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      cache: 'no-store',
    }
  )

  const json = (await response.json()) as { data?: ZohoMailFolder[]; error?: unknown }

  if (!response.ok) {
    throw new Error('Could not load Zoho folders.')
  }

  return json.data ?? []
}

export async function fetchZohoMessages(
  connection: ZohoConnection,
  folderId?: string | null
) {
  const readyConnection = await ensureZohoAccount(connection)
  const accessToken = await refreshZohoAccessToken(readyConnection)
  const mailBase = readyConnection.mail_api_base || zohoMailBaseFromLocation(null)

  const url = new URL(
    `${mailBase}/api/accounts/${readyConnection.account_id}/messages/view`
  )
  url.searchParams.set('start', '1')
  url.searchParams.set('limit', '25')
  if (folderId) {
    url.searchParams.set('folderId', folderId)
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    cache: 'no-store',
  })

  const json = (await response.json()) as { data?: ZohoMailMessage[]; error?: unknown }

  if (!response.ok) {
    throw new Error('Could not load Zoho inbox.')
  }

  return {
    connection: readyConnection,
    messages: json.data ?? [],
  }
}

export async function fetchZohoMessageContent(
  connection: ZohoConnection,
  folderId: string,
  messageId: string
) {
  const readyConnection = await ensureZohoAccount(connection)
  const accessToken = await refreshZohoAccessToken(readyConnection)
  const mailBase = readyConnection.mail_api_base || zohoMailBaseFromLocation(null)

  const url = new URL(
    `${mailBase}/api/accounts/${readyConnection.account_id}/folders/${folderId}/messages/${messageId}/content`
  )
  url.searchParams.set('includeBlockContent', 'true')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    cache: 'no-store',
  })

  const json = (await response.json()) as { data?: ZohoMailContent; error?: unknown }

  if (!response.ok) {
    throw new Error('Could not load this email.')
  }

  return json.data ?? null
}
