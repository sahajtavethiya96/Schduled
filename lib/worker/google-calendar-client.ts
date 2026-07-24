import { google } from 'googleapis'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { connectedCalendar } from '@/db/schema'
import { decrypt, encrypt } from '@/lib/encrypt'
import { createGoogleOAuthClient } from '@/lib/google/client'

type ConnectedCalendarRow = typeof connectedCalendar.$inferSelect

/**
 * Returns an authenticated Google Calendar API client for the given
 * connected calendar. Auto-refreshes the access token if it is within
 * 5 minutes of expiry and persists the new tokens to the DB.
 *
 * Throws if the calendar is not connected or tokens are missing/unrecoverable.
 */
export async function getGoogleCalendarClient(cal: ConnectedCalendarRow) {
  if (cal.provider !== 'google' || cal.status !== 'connected') {
    throw new Error(`Calendar ${cal.id} is not a connected Google calendar`)
  }
  if (!cal.accessToken) {
    throw new Error(`Calendar ${cal.id} has no access token`)
  }

  const oauth2 = createGoogleOAuthClient()

  const accessToken  = await decrypt(cal.accessToken)
  const refreshToken = cal.refreshToken ? await decrypt(cal.refreshToken) : null

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  const needsRefresh = cal.tokenExpiresAt
    ? cal.tokenExpiresAt < fiveMinutesFromNow
    : false

  if (needsRefresh && refreshToken) {
    oauth2.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2.refreshAccessToken()

    const newAccessToken  = credentials.access_token!
    const newExpiry       = credentials.expiry_date ? new Date(credentials.expiry_date) : null
    const newRefreshToken = credentials.refresh_token ?? null

    const encryptedAccess  = await encrypt(newAccessToken)
    const encryptedRefresh = newRefreshToken ? await encrypt(newRefreshToken) : cal.refreshToken

    await db
      .update(connectedCalendar)
      .set({
        accessToken:    encryptedAccess,
        refreshToken:   encryptedRefresh ?? undefined,
        tokenExpiresAt: newExpiry,
      })
      .where(eq(connectedCalendar.id, cal.id))

    oauth2.setCredentials({
      access_token:  newAccessToken,
      refresh_token: newRefreshToken ?? refreshToken,
      expiry_date:   credentials.expiry_date ?? undefined,
    })
  } else {
    oauth2.setCredentials({
      access_token:  accessToken,
      refresh_token: refreshToken ?? undefined,
      expiry_date:   cal.tokenExpiresAt?.getTime() ?? undefined,
    })
  }

  return google.calendar({ version: 'v3', auth: oauth2 })
}
