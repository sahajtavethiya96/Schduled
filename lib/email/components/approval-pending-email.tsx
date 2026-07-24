import { Hr, Link, Section, Text } from "react-email";
import { getAppUrl } from "@/lib/get-app-url";
import { canonicalizeTz } from "@/lib/utils";
import { EmailLayout, emailStyles } from "./layout";

interface ApprovalPendingEmailProps {
  cancelUrl: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeTimezone: string;
  locationLabel: string;
  whenHost: string;
  whenInvitee: string;
}

const amber = "#D97706";
const amberBg = "#FEF3C7";

export function ApprovalPendingEmail({
  cancelUrl,
  eventName,
  hostName,
  hostTimezone,
  inviteeName,
  inviteeTimezone,
  locationLabel,
  whenHost,
  whenInvitee,
}: ApprovalPendingEmailProps) {
  const logoUrl = `${getAppUrl()}/email-logo.png`;

  return (
    <EmailLayout logoUrl={logoUrl} preview={`Request received: ${eventName} with ${hostName}`}>
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            backgroundColor: amberBg,
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
          Awaiting Approval
        </Text>
      </Section>

      <Text style={{ ...emailStyles.heading, color: "#171717" }}>
        Your booking request has been received
      </Text>

      <Text style={emailStyles.paragraph}>
        Hi {inviteeName}, your request for {eventName} with {hostName} has been submitted.
        {" "}Your host will review and confirm or decline your request.
      </Text>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      <Section>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="With" value={hostName} />
        <DetailRow label={`Date & Time (${canonicalizeTz(hostTimezone)})`} value={whenHost} />
        {canonicalizeTz(inviteeTimezone) !== canonicalizeTz(hostTimezone) && (
          <DetailRow label={`Date & Time (${canonicalizeTz(inviteeTimezone)})`} value={whenInvitee} />
        )}
        <DetailRow label="Location" value={locationLabel} href={locationLabel.startsWith('http') ? locationLabel : undefined} />
        <DetailRow label="Status" value="Awaiting host approval" />
      </Section>

      <Hr style={{ borderColor: "#E5E7EB", margin: "20px 0" }} />

      <Text style={{ ...emailStyles.muted, textAlign: "center" as const }}>
        Changed your mind?{" "}
        <a href={cancelUrl} style={emailStyles.link}>
          Cancel this request
        </a>
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
