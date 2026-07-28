import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ApprovalPendingEmail } from "@/lib/email/components/approval-pending-email";
import { getEmailBranding } from "@/lib/email/branding";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface ApprovalPendingParams {
  cancelToken: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  startUtc: Date;
}

export async function approvalPendingTemplate(p: ApprovalPendingParams) {
  const branding = await getEmailBranding();
  const base = getAppUrl();
  const whenHost = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const whenInvitee = formatInTimeZone(p.startUtc, p.inviteeTimezone, DATE_FMT);
  const cancelUrl = `${base}/cancel/${p.cancelToken}`;

  const html = await renderEmailTemplate(
    createElement(ApprovalPendingEmail, {
      branding,
      cancelUrl,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeName: p.inviteeName,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      whenHost,
      whenInvitee,
    })
  );

  const text = `Hi ${p.inviteeName},

Your booking request for ${p.eventName} with ${p.hostName} has been received and is awaiting approval.

Date & Time (${p.hostTimezone}): ${whenHost}
${p.inviteeTimezone !== p.hostTimezone ? `Date & Time (${p.inviteeTimezone}): ${whenInvitee}\n` : ""}Location: ${p.locationLabel}
Status: Awaiting host approval

Changed your mind? Cancel: ${cancelUrl}

— ${branding.appName}`;

  return {
    html,
    text,
    subject: `Request received: ${p.eventName} with ${p.hostName}`,
  };
}
