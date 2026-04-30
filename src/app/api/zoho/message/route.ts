import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchZohoMessageContent, getZohoConnection } from '@/lib/zoho-mail'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const folderId = request.nextUrl.searchParams.get('folderId')
  const messageId = request.nextUrl.searchParams.get('messageId')

  if (!folderId || !messageId) {
    return NextResponse.json(
      { error: 'Folder id and message id are required.' },
      { status: 400 }
    )
  }

  const connection = await getZohoConnection(user.id)

  if (!connection) {
    return NextResponse.json({ error: 'Zoho is not connected.' }, { status: 400 })
  }

  try {
    const message = await fetchZohoMessageContent(connection, folderId, messageId)
    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load email.' },
      { status: 500 }
    )
  }
}
