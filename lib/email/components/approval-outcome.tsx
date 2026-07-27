import { Button, Hr, Link, Section, Text } from "react-email";
import { getAppUrl } from "@/lib/get-app-url";
import { canonicalizeTz } from "@/lib/utils";
import { EmailLayout, emailStyles } from "./layout";

interface ApprovalOutcomeEmailProps {
  approved: boolean;
  cancelUrl?: string | null;
  confirmationNote?: string | null;
  eventName: string;
  hostName: string;
  inviteeName: string;
  locationLabel: string;
  locationType?: string;
  meetLabel?: string;
  meetLink?: string | null;
  meetPassword?: string | null;
  rejectionReason?: string | null;
  rescheduleUrl?: string | null;
  whenHost: string;
  whenInvitee: string;
  hostTimezone: string;
  inviteeTimezone: string;
}

const teal = "#0D9488";
const red = "#EF4444";

export function ApprovalOutcomeEmail({
  approved,
  cancelUrl,
  confirmationNote,
  eventName,
  hostName,
  inviteeName,
  locationLabel,
  locationType,
  meetLabel,
  meetLink,
  meetPassword,
  rejectionReason,
  rescheduleUrl,
  whenHost,
  whenInvitee,
  hostTimezone,
  inviteeTimezone,
}: ApprovalOutcomeEmailProps) {
  const badgeColor = approved ? teal : red;
  const badgeBg = approved ? "#CCFBF1" : "#FEE2E2";
  const badgeText = approved ? "Booking Confirmed" : "Booking Declined";
  const linkMissing =
    approved && !meetLink && ["google_meet", "zoom", "teams"].includes(locationType ?? "");
  const providerName =
    locationType === "google_meet"
      ? "Google Meet"
      : locationType === "zoom"
        ? "Zoom"
        : locationType === "teams"
          ? "Microsoft Teams"
          : "video";
  const logoUrl = `${getAppUrl()}/email-logo.png`;

  return (
    <EmailLayout logoUrl={logoUrl}
      preview={
        approved
          ? `Confirmed: ${eventName} with ${hostName}`
          : `Declined: ${eventName} with ${hostName}`
      }
    >
      {/* Badge */}
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            backgroundColor: badgeBg,
            borderRadius: "4px",
            color: badgeColor,
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "4px 10px",
            textTransform: "uppercase",
          }}
        >
          {badgeText}
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        {approved ? "Your booking is confirmed!" : "Your booking request was declined"}
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {inviteeName},{" "}
        {approved
          ? `your request for ${eventName} with ${hostName} has been approved. See the details below.`
          : `unfortunately ${hostName} is unable to accept your booking request for ${eventName}.`}
      </Text>

      {!approved && rejectionReason && (
        <Section
          style={{
            backgroundColor: "#FEE2E2",
            borderLeft: `3px solid ${red}`,
            marginBottom: "16px",
            padding: "12px 16px",
          }}
        >
          <Text style={{ ...emailStyles.muted, margin: "0", fontWeight: 600 }}>
            Reason provided:
          </Text>
          <Text style={{ ...emailStyles.paragraph, margin: "4px 0 0" }}>
            {rejectionReason}
          </Text>
        </Section>
      )}

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Details */}
      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="With" value={hostName} />
        <DetailRow label={`Date & Time (${canonicalizeTz(hostTimezone)})`} value={whenHost} />
        {canonicalizeTz(inviteeTimezone) !== canonicalizeTz(hostTimezone) && (
          <DetailRow label={`Date & Time (${canonicalizeTz(inviteeTimezone)})`} value={whenInvitee} />
        )}
        <DetailRow label="Location" value={locationLabel} href={locationLabel.startsWith('http') ? locationLabel : undefined} />
      </Section>

      {approved && confirmationNote && (
        <Section
          style={{
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0",
            padding: "14px 18px",
            marginTop: "16px",
          }}
        >
          <Text style={{ ...emailStyles.paragraph, color: "#166534", margin: 0, lineHeight: "1.6" }}>
            {confirmationNote}
          </Text>
        </Section>
      )}

      {linkMissing && (
        <Section
          style={{
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            padding: "14px 18px",
            marginTop: "16px",
          }}
        >
          <Text style={{ color: "#92400E", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
            The {providerName} link isn&apos;t ready yet — {hostName} will share it with you
            before the meeting.
          </Text>
        </Section>
      )}

      {approved && (meetLink || cancelUrl) && (
        <>
          <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />
          <Section style={{ textAlign: "center" as const }}>
            {meetLink && (
              <Button
                href={meetLink}
                style={{
                  ...emailStyles.button,
                  backgroundColor: teal,
                  marginBottom: "12px",
                }}
              >
                {meetLabel ?? "Join Meeting"}
              </Button>
            )}
          </Section>
          {meetLink && meetPassword && (
            <Section style={{ textAlign: "center" as const, marginBottom: "12px" }}>
              <Text style={{ ...emailStyles.muted, margin: "0 0 2px" }}>Meeting Password</Text>
              <Text style={{ ...emailStyles.paragraph, fontWeight: 700, margin: 0 }}>
                {meetPassword}
              </Text>
            </Section>
          )}
          {(cancelUrl || rescheduleUrl) && (
            <Text
              style={{
                ...emailStyles.muted,
                textAlign: "center" as const,
                marginTop: "12px",
              }}
            >
              {rescheduleUrl && (
                <a href={rescheduleUrl} style={emailStyles.link}>
                  Reschedule
                </a>
              )}
              {rescheduleUrl && cancelUrl && " · "}
              {cancelUrl && (
                <a href={cancelUrl} style={emailStyles.link}>
                  Cancel
                </a>
              )}
            </Text>
          )}
        </>
      )}

      {!approved && (
        <Text style={{ ...emailStyles.muted, textAlign: "center" as const, marginTop: "16px" }}>
          Feel free to reach out to {hostName} directly if you have questions.
        </Text>
      )}
    </EmailLayout>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text style={{ ...emailStyles.muted, margin: "0" }}>{label}</Text>
      {href ? (
        <Link href={href} style={{ color: "#0D9488", fontSize: "14px", fontWeight: 600, display: "block", textDecoration: "underline" }}>
          View Location
        </Link>
      ) : (
        <Text style={{ ...emailStyles.paragraph, fontWeight: 600, margin: "2px 0 0" }}>
          {value}
        </Text>
      )}
    </Section>
  );
}
