import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/authz'
import { safeReturnTo } from '@/lib/api/helpers'
import { getAppUrl } from '@/lib/get-app-url'
import { createGoogleOAuthClient, googleCalendarConfigured } from '@/lib/google/client'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

export async function GET(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login', getAppUrl()))
  }

  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'))

  if (!googleCalendarConfigured()) {
    const fallback = new URL(returnTo, getAppUrl())
    fallback.searchParams.set('calendar_error', 'not_configured')
    return NextResponse.redirect(fallback)
  }

  const oauth2Client = createGoogleOAuthClient()

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, returnTo }),
  ).toString('base64')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // ensures refresh_token is always returned
    scope: SCOPES,
    state,
  })

  return NextResponse.redirect(authUrl)
}
