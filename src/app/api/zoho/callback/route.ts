import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchZohoAccounts,
  zohoAccountsServer,
  zohoMailBaseFromLocation,
  zohoRedirectUri,
} from '@/lib/zoho-mail'

export const dynamic = 'force-dynamic'

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
}

function expiresAt(expiresInSeconds: number | undefined) {
  const seconds = expiresInSeconds ?? 3600
  return new Date(Date.now() + Math.max(seconds - 120, 60) * 1000).toISOString()
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const location = url.searchParams.get('location')
  const accountsServer =
    url.searchParams.get('accounts-server') || zohoAccountsServer()

  const cookieStore = await cookies()
  const expectedState = cookieStore.get('zoho_oauth_state')?.value
  cookieStore.delete('zoho_oauth_state')

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/mail?error=invalid_zoho_state', request.url))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/mail?error=missing_zoho_credentials', request.url)
    )
  }

  const tokenUrl = new URL(`${accountsServer}/oauth/v2/token`)
  tokenUrl.searchParams.set('code', code)
  tokenUrl.searchParams.set('grant_type', 'authorization_code')
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('client_secret', clientSecret)
  tokenUrl.searchParams.set('redirect_uri', zohoRedirectUri(request.nextUrl.origin))

  const tokenResponse = await fetch(tokenUrl.toString(), {
    method: 'POST',
    cache: 'no-store',
  })
  const tokenData = (await tokenResponse.json()) as TokenResponse

  if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token) {
    return NextResponse.redirect(new URL('/mail?error=zoho_token_failed', request.url))
  }

  const mailApiBase = zohoMailBaseFromLocation(location)

  await supabase.from('zoho_mail_connections').upsert(
    {
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt(tokenData.expires_in),
      accounts_server: accountsServer,
      mail_api_base: mailApiBase,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  const { data: savedConnection } = await supabase
    .from('zoho_mail_connections')
    .select(
      'user_id, access_token, refresh_token, expires_at, accounts_server, mail_api_base, account_id, email_address'
    )
    .eq('user_id', user.id)
    .single()

  if (savedConnection) {
    try {
      const accounts = await fetchZohoAccounts(savedConnection)
      const account = accounts[0]

      if (account?.accountId) {
        await supabase
          .from('zoho_mail_connections')
          .update({
            account_id: account.accountId,
            email_address:
              account.primaryEmailAddress || account.mailboxAddress || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    } catch {}
  }

  return NextResponse.redirect(new URL('/mail?connected=1', request.url))
}


