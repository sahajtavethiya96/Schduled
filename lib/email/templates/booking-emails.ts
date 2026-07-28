import { formatInTimeZone } from "date-fns-tz";
import { createElement } from "react";
import {
  BookingEmail,
  type BookingEmailAudience,
  type BookingEmailVariant,
} from "@/lib/email/components/booking-email";
import { getEmailBranding } from "@/lib/email/branding";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { getAppUrl } from "@/lib/get-app-url";

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

export interface BookingEmailInput {
  audience: BookingEmailAudience;
  cancelToken: string;
  confirmationNote?: string | null;
  eventName: string;
  hostTimezone: string;
  inviteeTimezone: string;
  locationLabel: string;
  locationType: string;
  meetLabel?: string;
  meetLink: string | null;
  meetPassword?: string | null;
  otherPartyName: string;
  previousStartUtc: Date | null;
  reason: string | null;
  recipientName: string;
  rescheduleToken: string;
  startUtc: Date;
  variant: BookingEmailVariant;
}

const VERB: Record<BookingEmailVariant, string> = {
  confirmation: "confirmed",
  cancellation: "cancelled",
  reschedule: "rescheduled",
};

export async function bookingEmail(p: BookingEmailInput) {
  const branding = await getEmailBranding();
  const base = getAppUrl();

  const whenHost = formatInTimeZone(p.startUtc, p.hostTimezone, DATE_FMT);
  const whenInvitee = formatInTimeZone(p.startUtc, p.inviteeTimezone, DATE_FMT);
  const previousWhen = p.previousStartUtc
    ? formatInTimeZone(p.previousStartUtc, p.inviteeTimezone, DATE_FMT)
    : null;

  // Manage links only for the invitee on non-cancelled mails
  const isInvitee = p.audience === "invitee";
  const rescheduleUrl = isInvitee
    ? `${base}/reschedule/${p.rescheduleToken}`
    : null;
  const cancelUrl = isInvitee ? `${base}/cancel/${p.cancelToken}` : null;

  const html = await renderEmailTemplate(
    createElement(BookingEmail, {
      variant: p.variant,
      audience: p.audience,
      branding,
      recipientName: p.recipientName,
      otherPartyName: p.otherPartyName,
      eventName: p.eventName,
      whenHost,
      hostTimezone: p.hostTimezone,
      whenInvitee,
      inviteeTimezone: p.inviteeTimezone,
      locationLabel: p.locationLabel,
      locationType: p.locationType,
      meetLink: p.variant === "cancellation" ? null : p.meetLink,
      meetLabel: p.meetLabel ?? "Join Meeting",
      meetPassword: p.variant === "cancellation" ? null : p.meetPassword,
      rescheduleUrl: p.variant === "cancellation" ? null : rescheduleUrl,
      cancelUrl: p.variant === "cancellation" ? null : cancelUrl,
      previousWhen: p.variant === "reschedule" ? previousWhen : null,
      reason: p.variant === "cancellation" ? p.reason : null,
      confirmationNote: p.variant === "confirmation" && p.audience === "invitee" ? (p.confirmationNote ?? null) : null,
    })
  );

  const lines = [
    `Hi ${p.recipientName},`,
    "",
    `Your ${p.eventName} with ${p.otherPartyName} has been ${VERB[p.variant]}.`,
    "",
    p.variant === "reschedule" && previousWhen
      ? `Previous time (${p.inviteeTimezone}): ${previousWhen}`
      : "",
    `Time (${p.hostTimezone}): ${whenHost}`,
    `Time (${p.inviteeTimezone}): ${whenInvitee}`,
    `Location: ${p.locationLabel}`,
    p.variant === "cancellation" && p.reason ? `Reason: ${p.reason}` : "",
    p.variant !== "cancellation" && p.meetLink ? `\nJoin: ${p.meetLink}` : "",
    p.variant !== "cancellation" && p.meetLink && p.meetPassword
      ? `Meeting Password: ${p.meetPassword}`
      : "",
    isInvitee && p.variant !== "cancellation"
      ? `\nReschedule: ${rescheduleUrl}\nCancel: ${cancelUrl}`
      : "",
    "",
    `— ${branding.appName}`,
  ].filter((l) => l !== "");

  const subjectMap: Record<BookingEmailVariant, string> = {
    confirmation: isInvitee
      ? `Confirmed: ${p.eventName} with ${p.otherPartyName}`
      : `New booking: ${p.eventName} with ${p.otherPartyName}`,
    cancellation: `Cancelled: ${p.eventName} with ${p.otherPartyName}`,
    reschedule: `Rescheduled: ${p.eventName} with ${p.otherPartyName}`,
  };

  return { html, text: lines.join("\n"), subject: subjectMap[p.variant] };
}
