import { eq } from 'drizzle-orm'
import type { Job } from 'pg-boss'
import { db } from '@/lib/db'
import { connectedCalendar } from '@/db/schema'
import { decrypt, encrypt } from '@/lib/encrypt'
import { createGoogleOAuthClient } from '@/lib/google/client'
import { enqueueJob } from '@/lib/worker/enqueue'
import { type CalendarTokenRefreshPayload, JOB_NAMES } from '@/lib/worker/job-types'

export async function handleCalendarTokenRefresh(
  jobs: Job<CalendarTokenRefreshPayload>[],
) {
  for (const job of jobs) {
    await processCalendarTokenRefresh(job)
  }
}

async function processCalendarTokenRefresh(job: Job<CalendarTokenRefreshPayload>) {
  const { connectedCalendarId } = job.data

  const [cal] = await db
    .select()
    .from(connectedCalendar)
    .where(eq(connectedCalendar.id, connectedCalendarId))
    .limit(1)

  if (!cal || cal.provider !== 'google' || !cal.refreshToken) {
    console.warn(`[calendar-token-refresh] skipping ${connectedCalendarId}: not found or no refresh token`)
    return
  }

  const oauth2 = await createGoogleOAuthClient()

  const refreshToken = await decrypt(cal.refreshToken)

  try {
    oauth2.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2.refreshAccessToken()

    const newAccess  = credentials.access_token!
    const newExpiry  = credentials.expiry_date ? new Date(credentials.expiry_date) : null
    const newRefresh = credentials.refresh_token ?? null

    const encryptedAccess  = await encrypt(newAccess)
    const encryptedRefresh = newRefresh ? await encrypt(newRefresh) : cal.refreshToken

    await db
      .update(connectedCalendar)
      .set({
        accessToken:    encryptedAccess,
        refreshToken:   encryptedRefresh,
        tokenExpiresAt: newExpiry,
        status:         'connected',
      })
      .where(eq(connectedCalendar.id, connectedCalendarId))

    console.log(`[calendar-token-refresh] refreshed token for ${connectedCalendarId}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // googleapis surfaces the OAuth error code under response.data.error
    const oauthError = String(
      (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error ?? ''
    )
    // Only these mean the grant is genuinely dead — anything else (network
    // blip, Google 5xx, rate limit) is transient and should be retried.
    const isPermanent =
      /invalid_grant|invalid_client|unauthorized_client/i.test(oauthError) ||
      /invalid_grant|invalid_client|unauthorized_client/i.test(message)

    // pg-boss exposes the current attempt count (0-based) as retrycount.
    const attempt = Number(
      (job as { retryCount?: number; retrycount?: number }).retryCount ??
        (job as { retrycount?: number }).retrycount ??
        0
    )
    const retryLimit = 3

    if (!isPermanent && attempt < retryLimit) {
      // Transient failure with retries left — re-throw so pg-boss retries.
      console.warn(
        `[calendar-token-refresh] transient failure for ${connectedCalendarId} (attempt ${attempt}), retrying:`,
        message
      )
      throw err
    }

    console.error(
      `[calendar-token-refresh] ${isPermanent ? 'permanent' : 'exhausted'} failure for ${connectedCalendarId}:`,
      message
    )

    await db
      .update(connectedCalendar)
      .set({
        status:         'disconnected',
        disconnectedAt: new Date(),
      })
      .where(eq(connectedCalendar.id, connectedCalendarId))

    await enqueueJob(JOB_NAMES.CALENDAR_DISCONNECT_ALERT, {
      connectedCalendarId,
      userId: cal.userId,
    })
  }
}
