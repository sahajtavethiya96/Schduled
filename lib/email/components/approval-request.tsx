import { Button, Hr, Link, Section, Text } from "react-email";
import { getAppUrl } from "@/lib/get-app-url";
import { EmailLayout, emailStyles } from "./layout";

interface ApprovalRequestEmailProps {
  approveUrl: string;
  eventName: string;
  hostName: string;
  inviteeEmail: string;
  inviteeName: string;
  locationLabel: string;
  reviewUrl: string;
  whenHost: string;
  hostTimezone: string;
}

export function ApprovalRequestEmail({
  approveUrl,
  eventName,
  hostName,
  inviteeEmail,
  inviteeName,
  locationLabel,
  reviewUrl,
  whenHost,
  hostTimezone,
}: ApprovalRequestEmailProps) {
  const amber = "#D97706";

  const logoUrl = `${getAppUrl()}/email-logo.png`;

  return (
    <EmailLayout preview={`New booking request: ${eventName} with ${inviteeName}`} logoUrl={logoUrl}>
      {/* Badge */}
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: "4px",
            color: amber,
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "4px 10px",
            textTransform: "uppercase",
          }}
        >
          Booking Request
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        New request from {inviteeName}
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {hostName}, someone wants to book time with you. Review the details below and approve or decline.
      </Text>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Details */}
      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="Requested by" value={`${inviteeName} (${inviteeEmail})`} />
        <DetailRow label="Date & Time" value={`${whenHost} (${hostTimezone})`} />
        <DetailRow label="Location" value={locationLabel} href={locationLabel.startsWith('http') ? locationLabel : undefined} />
      </Section>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      {/* Actions */}
      <Section style={{ textAlign: "center" as const }}>
        <Button
          href={approveUrl}
          style={{
            ...emailStyles.button,
            backgroundColor: "#0D9488",
            marginBottom: "12px",
            marginRight: "12px",
          }}
        >
          Approve
        </Button>
        <Button
          href={reviewUrl}
          style={{
            ...emailStyles.button,
            backgroundColor: "#374151",
          }}
        >
          Review &amp; Decline
        </Button>
      </Section>

      <Text style={{ ...emailStyles.muted, marginTop: "16px", textAlign: "center" as const }}>
        You can also manage this request from your{" "}
        <a href={reviewUrl} style={emailStyles.link}>
          dashboard
        </a>
        .
      </Text>
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
