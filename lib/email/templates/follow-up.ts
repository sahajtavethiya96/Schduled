import { createElement } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { renderEmailTemplate } from '@/lib/email/renderer'
import { FollowUpEmail } from '@/lib/email/components/follow-up'
import { getEmailBranding } from '@/lib/email/branding'
import { getAppUrl } from '@/lib/get-app-url'

interface FollowUpParams {
  inviteeName:     string
  hostName:        string
  eventName:       string
  endUtc:          Date
  inviteeTimezone: string
  bookingId:       string
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a"

export async function followUpTemplate(p: FollowUpParams) {
  const branding   = await getEmailBranding()
  const when       = formatInTimeZone(p.endUtc, p.inviteeTimezone, DATE_FMT)
  const bookingUrl = `${getAppUrl()}/bookings/${p.bookingId}`

  const html = await renderEmailTemplate(
    createElement(FollowUpEmail, {
      branding,
      inviteeName: p.inviteeName,
      hostName:    p.hostName,
      eventName:   p.eventName,
      when,
      bookingUrl,
    })
  )

  return {
    subject: `Thanks for meeting — ${p.eventName}`,
    html,
  }
}
