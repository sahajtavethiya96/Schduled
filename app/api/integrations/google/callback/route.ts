import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { getCurrentSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { connectedCalendar, user } from '@/db/schema'
import { encrypt } from '@/lib/encrypt'
import { audit } from '@/lib/audit'
import { safeReturnTo } from '@/lib/api/helpers'
import { getAppUrl } from '@/lib/get-app-url'
import { createGoogleOAuthClient, googleCalendarConfigured } from '@/lib/google/client'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const failUrl = new URL('/dashboard?calendar_error=1', getAppUrl())

  if (error || !code || !stateParam) {
    return NextResponse.redirect(failUrl)
  }

  let state: { userId: string; returnTo: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8'))
  } catch {
    return NextResponse.redirect(failUrl)
  }

  // Verify the current session matches the state userId
  const session = await getCurrentSession()
  if (!session || session.user.id !== state.userId) {
    return NextResponse.redirect(new URL('/login', getAppUrl()))
  }

  if (!googleCalendarConfigured()) {
    return NextResponse.redirect(failUrl)
  }

  const oauth2Client = createGoogleOAuthClient()

  type OAuthTokens = {
    access_token?: string | null
    refresh_token?: string | null
    expiry_date?: number | null
  }
  let tokens: OAuthTokens | null = null
  try {
    const result = await oauth2Client.getToken(code)
    tokens = result.tokens as OAuthTokens
  } catch {
    return NextResponse.redirect(failUrl)
  }

  if (!tokens?.access_token) {
    return NextResponse.redirect(failUrl)
  }

  // Fetch the primary calendar details
  oauth2Client.setCredentials(tokens)
  const cal = google.calendar({ version: 'v3', auth: oauth2Client })

  let accountEmail = session.user.email
  let calendarName = 'Primary Calendar'
  try {
    const calListRes = await cal.calendarList.list({ maxResults: 1, minAccessRole: 'owner' })
    const primary = calListRes.data.items?.[0]
    if (primary?.id) accountEmail = primary.id
    if (primary?.summary) calendarName = primary.summary
  } catch {
    // Non-fatal — use email fallback
  }

  // Encrypt tokens before storing (access_token null-check already done above)
  const encryptedAccess = await encrypt(tokens.access_token!)
  const encryptedRefresh = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null
  const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null

  // Upsert: replace existing Google connection for this user
  const [existing] = await db
    .select({ id: connectedCalendar.id })
    .from(connectedCalendar)
    .where(
      and(
        eq(connectedCalendar.userId, session.user.id),
        eq(connectedCalendar.provider, 'google'),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(connectedCalendar)
      .set({
        accountEmail,
        calendarName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh ?? undefined,
        tokenExpiresAt,
        status: 'connected',
        disconnectedAt: null,
        // Restore write + conflict-check on reconnect. Disconnect clears
        // isWriteTarget, and without this the calendar would look "Connected"
        // but silently stop receiving events / Meet links.
        isWriteTarget: true,
        isConflictCheck: true,
      })
      .where(eq(connectedCalendar.id, existing.id))
  } else {
    await db.insert(connectedCalendar).values({
      id: createId(),
      userId: session.user.id,
      provider: 'google',
      accountEmail,
      calendarName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt,
      status: 'connected',
      isPrimary: true,
      isConflictCheck: true,
      isWriteTarget: true,
    })
  }

  // Advance onboarding step to 4 (calendar is step 4 in the current onboarding order)
  await db
    .update(user)
    .set({ onboardingStep: 4, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))

  await audit({
    action: 'calendar.connected',
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: 'connected_calendar',
    description: 'Connected Google Calendar',
    metadata: { provider: 'google', accountEmail },
  })

  const returnUrl = new URL(safeReturnTo(state.returnTo), getAppUrl())
  returnUrl.searchParams.set('calendar_connected', '1')
  return NextResponse.redirect(returnUrl)
}
