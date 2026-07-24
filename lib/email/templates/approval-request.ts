import { createElement } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ApprovalRequestEmail } from "@/lib/email/components/approval-request";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface ApprovalRequestParams {
  approvalToken: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeEmail: string;
  inviteeName: string;
  locationLabel: string;
  startUtc: Date;
}

export async function approvalRequestTemplate(p: ApprovalRequestParams) {
  const base = getAppUrl();
  const whenHost = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const reviewUrl = `${base}/booking/review/${p.approvalToken}`;
  const approveUrl = `${base}/booking/review/${p.approvalToken}?action=approve`;

  const html = await renderEmailTemplate(
    createElement(ApprovalRequestEmail, {
      approveUrl,
      eventName: p.eventName,
      hostName: p.hostName,
      hostTimezone: p.hostTimezone,
      inviteeEmail: p.inviteeEmail,
      inviteeName: p.inviteeName,
      locationLabel: p.locationLabel,
      reviewUrl,
      whenHost,
    })
  );

  const text = `Hi ${p.hostName},

You have a new booking request for ${p.eventName}.

Requested by: ${p.inviteeName} (${p.inviteeEmail})
Date & Time: ${whenHost} (${p.hostTimezone})
Location: ${p.locationLabel}

Approve: ${approveUrl}
Review & Decline: ${reviewUrl}

— Schduled`;

  return {
    html,
    text,
    subject: `New booking request: ${p.eventName} with ${p.inviteeName}`,
  };
}
