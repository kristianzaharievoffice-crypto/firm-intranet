import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { zohoAccountsServer, zohoRedirectUri } from '@/lib/zoho-mail'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.ZOHO_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/mail?error=missing_zoho_client_id', request.url)
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('zoho_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  })

  const authUrl = new URL(`${zohoAccountsServer()}/oauth/v2/auth`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', zohoRedirectUri(request.nextUrl.origin))
  authUrl.searchParams.set(
    'scope',
    'ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL'
  )
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl)
}
