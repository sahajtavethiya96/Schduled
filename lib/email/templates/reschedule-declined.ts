import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { RescheduleDeclinedEmail } from "@/lib/email/components/reschedule-declined";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getEmailBranding } from "@/lib/email/branding";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface RescheduleDeclinedParams {
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  originalStartUtc: Date;
  reason?: string | null;
}

export async function rescheduleDeclinedTemplate(p: RescheduleDeclinedParams) {
  const branding = await getEmailBranding();
  const whenHost = formatInTimeZone(p.originalStartUtc, p.hostTimezone, DATE_FMT);
  const whenInvitee = formatInTimeZone(p.originalStartUtc, p.inviteeTimezone, DATE_FMT);

  const html = await renderEmailTemplate(
    createElement(RescheduleDeclinedEmail, {
      branding,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeName: p.inviteeName,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      reason: p.reason ?? null,
      whenHost,
      whenInvitee,
    })
  );

  const text = `Hi ${p.inviteeName},

Your request to reschedule ${p.eventName} with ${p.hostName} wasn't approved.

Your original meeting remains confirmed:
Date & Time: ${whenInvitee} (${p.inviteeTimezone})
Location: ${p.locationLabel}${p.reason ? `\n\nReason provided: ${p.reason}` : ""}

— ${branding.appName}`;

  return {
    html,
    text,
    subject: `Reschedule request declined: ${p.eventName}`,
  };
}
