import { createElement } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { renderEmailTemplate } from '@/lib/email/renderer'
import { ReminderInviteeEmail } from '@/lib/email/components/reminder-invitee'
import { getEmailBranding } from '@/lib/email/branding'
import { getAppUrl } from '@/lib/get-app-url'

interface ReminderInviteeParams {
  inviteeName:     string
  hostName:        string
  eventName:       string
  startUtc:        Date
  hostTimezone:    string
  inviteeTimezone: string
  locationLabel:   string
  meetLink:        string | null
  meetLabel:       string
  meetPassword?:   string | null
  cancelToken:     string
  rescheduleToken: string
  timeUntil:       '24 hours' | '1 hour' | '10 minutes' | '5 minutes'
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a"

export async function reminderInviteeTemplate(p: ReminderInviteeParams) {
  const branding = await getEmailBranding()
  const base = getAppUrl()

  const startFormatted = formatInTimeZone(p.startUtc, p.hostTimezone,    DATE_FMT)
  const inviteeTime    = formatInTimeZone(p.startUtc, p.inviteeTimezone, DATE_FMT)

  const cancelUrl      = `${base}/cancel/${p.cancelToken}`
  const rescheduleUrl  = `${base}/reschedule/${p.rescheduleToken}`

  const html = await renderEmailTemplate(
    createElement(ReminderInviteeEmail, {
      branding,
      inviteeName:     p.inviteeName,
      hostName:        p.hostName,
      eventName:       p.eventName,
      startFormatted,
      hostTimezone:    p.hostTimezone,
      inviteeTime,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel:   p.locationLabel,
      meetLink:        p.meetLink,
      meetLabel:       p.meetLabel,
      meetPassword:    p.meetPassword,
      cancelUrl,
      rescheduleUrl,
      timeUntil:       p.timeUntil,
    }),
  )

  const text = `Hi ${p.inviteeName},

Your ${p.eventName} with ${p.hostName} is in ${p.timeUntil}.

Time (${p.hostTimezone}): ${startFormatted}
Time (${p.inviteeTimezone}): ${inviteeTime}
Location: ${p.locationLabel}
${p.meetLink ? `\nJoin: ${p.meetLink}` : ''}
${p.meetLink && p.meetPassword ? `Meeting Password: ${p.meetPassword}\n` : ''}
Reschedule: ${rescheduleUrl}
Cancel: ${cancelUrl}

— ${branding.appName}`

  return { html, text }
}
