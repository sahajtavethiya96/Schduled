import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ApprovalOutcomeEmail } from "@/lib/email/components/approval-outcome";
import { getEmailBranding } from "@/lib/email/branding";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface ApprovalApprovedParams {
  cancelToken: string;
  confirmationNote?: string | null;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  locationType: string;
  meetLabel: string;
  meetLink: string | null;
  meetPassword?: string | null;
  rescheduleToken: string;
  startUtc: Date;
}

export async function approvalApprovedTemplate(p: ApprovalApprovedParams) {
  const branding = await getEmailBranding();
  const base = getAppUrl();
  const whenHost = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const whenInvitee = formatInTimeZone(p.startUtc, p.inviteeTimezone, DATE_FMT);
  const cancelUrl = `${base}/cancel/${p.cancelToken}`;
  const rescheduleUrl = `${base}/reschedule/${p.rescheduleToken}`;

  const html = await renderEmailTemplate(
    createElement(ApprovalOutcomeEmail, {
      approved: true,
      branding,
      cancelUrl,
      confirmationNote: p.confirmationNote ?? null,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeName: p.inviteeName,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      locationType: p.locationType,
      meetLabel: p.meetLabel,
      meetLink: p.meetLink,
      meetPassword: p.meetPassword,
      rescheduleUrl,
      whenHost,
      whenInvitee,
    })
  );

  const text = `Hi ${p.inviteeName},

Your booking request for ${p.eventName} with ${p.hostName} has been approved!

Date & Time (${p.hostTimezone}): ${whenHost}
${p.inviteeTimezone !== p.hostTimezone ? `Date & Time (${p.inviteeTimezone}): ${whenInvitee}\n` : ""}Location: ${p.locationLabel}
${p.meetLink ? `\nJoin: ${p.meetLink}` : ""}
${p.meetLink && p.meetPassword ? `Meeting Password: ${p.meetPassword}\n` : ""}
Reschedule: ${rescheduleUrl}
Cancel: ${cancelUrl}

— ${branding.appName}`;

  return {
    html,
    text,
    subject: `Confirmed: ${p.eventName} with ${p.hostName}`,
  };
}
