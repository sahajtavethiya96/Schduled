import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { getAppUrl } from "@/lib/get-app-url";
import { canonicalizeTz } from "@/lib/utils";

interface Props {
  hostName: string;
  inviteeName: string;
  eventName: string;
  startFormatted: string; // e.g. "Monday, June 17, 2026 at 3:00 PM"
  hostTimezone: string;
  inviteeTime: string; // same meeting time in invitee tz
  inviteeTimezone: string;
  locationLabel: string;
  startMeetLink: string | null; // Zoom start URL or Google Meet link
  meetLabel: string; // "Start Google Meet" | "Start Zoom Meeting"
  timeUntil: string; // "24 hours" | "1 hour"
  dashboardUrl: string;
}

const teal = "#0D9488";
const bg = "#F3F7F6";
const white = "#ffffff";
const text1 = "#171717";
const text2 = "#4B5563";
const border = "#D1FAE5";
const amber = "#FEF3C7";
const amberBorder = "#FDE68A";
const amberText = "#92400E";

export function ReminderHostEmail({
  hostName,
  inviteeName,
  eventName,
  startFormatted,
  hostTimezone,
  inviteeTime,
  inviteeTimezone,
  locationLabel,
  startMeetLink,
  meetLabel,
  timeUntil,
  dashboardUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        Upcoming in {timeUntil}: {eventName} with {inviteeName}
      </Preview>
      <Body
        style={{
          backgroundColor: bg,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: white,
            maxWidth: "560px",
            margin: "40px auto",
            border: `1px solid ${border}`,
          }}
        >
          {/* Teal header */}
          <Section style={{ backgroundColor: teal, padding: "28px 32px" }}>
            <Img src={`${getAppUrl()}/email-logo-white.png`} width="132" height="28" alt="Schduled" style={{ display: 'block', marginBottom: '8px' }} />
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "14px",
                margin: "6px 0 0",
              }}
            >
              Host reminder
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 32px" }}>
            <Text
              style={{
                color: text1,
                fontSize: "18px",
                fontWeight: 700,
                margin: "0 0 4px",
              }}
            >
              Hi {hostName},
            </Text>
            <Text
              style={{ color: text2, fontSize: "15px", margin: "0 0 24px" }}
            >
              You have an upcoming{" "}
              <strong>{eventName}</strong> with{" "}
              <strong>{inviteeName}</strong> in{" "}
              <strong>{timeUntil}</strong>.
            </Text>

            {/* Amber heads-up banner */}
            <Section
              style={{
                backgroundColor: amber,
                border: `1px solid ${amberBorder}`,
                padding: "12px 16px",
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  color: amberText,
                  fontSize: "13px",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                ⏰ Meeting starts in {timeUntil} — make sure you're ready!
              </Text>
            </Section>

            {/* Meeting details card */}
            <Section
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                padding: "20px 24px",
                marginBottom: "24px",
              }}
            >
              <Row label="Event" value={eventName} />
              <Row label="With" value={inviteeName} />
              <Row
                label={`Time (${canonicalizeTz(hostTimezone)})`}
                value={startFormatted}
              />
              {canonicalizeTz(inviteeTimezone) !== canonicalizeTz(hostTimezone) && (
                <Row
                  label={`Time (${canonicalizeTz(inviteeTimezone)})`}
                  value={inviteeTime}
                />
              )}
              <Row label="Location" value={locationLabel} href={locationLabel.startsWith('http') ? locationLabel : undefined} />
            </Section>

            {/* Start meeting button */}
            {startMeetLink && (
              <Section
                style={{ textAlign: "center", marginBottom: "24px" }}
              >
                <a
                  href={startMeetLink}
                  style={{
                    backgroundColor: teal,
                    color: white,
                    display: "inline-block",
                    fontSize: "15px",
                    fontWeight: 700,
                    padding: "12px 28px",
                    textDecoration: "none",
                  }}
                >
                  {meetLabel}
                </a>
              </Section>
            )}

            <Hr style={{ borderColor: border, margin: "24px 0" }} />

            <Text
              style={{ color: text2, fontSize: "13px", margin: 0 }}
            >
              This reminder was sent because you have an event scheduled on{" "}
              <strong>Schduled</strong>. Manage your events at{" "}
              <a
                href={dashboardUrl}
                style={{ color: teal }}
              >
                your dashboard
              </a>
              .
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: bg,
              padding: "16px 32px",
              borderTop: `1px solid ${border}`,
            }}
          >
            <Text
              style={{
                color: text2,
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
              }}
            >
              © Schduled
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text
        style={{
          color: "#6B7280",
          fontSize: "12px",
          margin: "0 0 1px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Text>
      {href ? (
        <Link href={href} style={{ color: "#0D9488", fontSize: "14px", fontWeight: 600, display: "block", textDecoration: "underline" }}>
          View Location
        </Link>
      ) : (
        <Text style={{ color: "#111827", fontSize: "14px", fontWeight: 600, margin: 0 }}>
          {value}
        </Text>
      )}
    </Section>
  );
}
