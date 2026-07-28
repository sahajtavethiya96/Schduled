import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ApprovalOutcomeEmail } from "@/lib/email/components/approval-outcome";
import { getEmailBranding } from "@/lib/email/branding";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { env } from "@/lib/env";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface ApprovalRejectedParams {
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  rejectionReason: string | null;
  startUtc: Date;
}

export async function approvalRejectedTemplate(p: ApprovalRejectedParams) {
  const branding = await getEmailBranding();
  const whenHost = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const whenInvitee = formatInTimeZone(p.startUtc, p.inviteeTimezone, DATE_FMT);

  const html = await renderEmailTemplate(
    createElement(ApprovalOutcomeEmail, {
      approved: false,
      branding,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeName: p.inviteeName,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      rejectionReason: p.rejectionReason,
      whenHost,
      whenInvitee,
    })
  );

  const text = `Hi ${p.inviteeName},

Unfortunately, ${p.hostName} is unable to accept your booking request for ${p.eventName}.
${p.rejectionReason ? `\nReason: ${p.rejectionReason}\n` : ""}
Date & Time (${p.hostTimezone}): ${whenHost}

Please reach out to ${p.hostName} directly if you have any questions.

— ${branding.appName}`;

  return {
    html,
    text,
    subject: `Booking request declined: ${p.eventName}`,
  };
}
