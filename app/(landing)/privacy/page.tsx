import {
  LegalHighlight,
  LegalLi,
  LegalP,
  LegalSection,
  LegalShell,
  LegalUl,
  type TocEntry,
} from "@/components/landing/legal-shell";
import { env } from "@/lib/env";

export const metadata = {
  title: "Privacy Policy — Schduled",
  description:
    "Learn how Schduled collects, uses, and protects your personal information.",
};

const TOC: TocEntry[] = [
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Data" },
  { id: "calendar-data", label: "Calendar Data" },
  { id: "storage-security", label: "Storage & Security" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "your-rights", label: "Your Rights" },
  { id: "data-retention", label: "Data Retention" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      description="We built Schduled to be simple and transparent. This policy explains exactly what data we collect, why we need it, and how we protect it."
      eyebrow="Legal"
      lastUpdated="June 2026"
      title="Privacy Policy"
      toc={TOC}
    >
      <LegalHighlight>
        Short version: We collect only what we need to run the scheduling
        service. We never sell your data. Calendar access is read-only by
        default and used solely to prevent double-bookings.
      </LegalHighlight>

      <LegalSection id="information-we-collect" title="Information We Collect">
        <LegalP>
          When you create a Schduled account or use the service, we may collect
          the following categories of information:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="text-base-content">Account information</strong> —
            your name, email address, and profile photo when you sign up with
            Google or via magic link.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Booking data</strong> — when
            invitees book time with you, we collect their name, email, phone
            number (if requested), timezone, and answers to any custom questions
            you configured.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">
              Availability preferences
            </strong>{" "}
            — the working hours, buffer times, and scheduling rules you
            configure so we know when you're available.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Usage data</strong> — basic
            server logs (IP address, browser type, page visited, timestamps) to
            maintain service reliability and diagnose errors.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not collect payment information. Schduled is free and has no
          billing system.
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-use" title="How We Use Your Data">
        <LegalP>
          We use the information we collect for the following purposes only:
        </LegalP>
        <LegalUl>
          <LegalLi>
            To create and maintain your account and scheduling profile.
          </LegalLi>
          <LegalLi>
            To show your booking page to invitees and process their booking
            requests.
          </LegalLi>
          <LegalLi>
            To send confirmation, reminder, and cancellation emails to both you
            and your invitees.
          </LegalLi>
          <LegalLi>
            To generate Google Meet or Zoom video links for confirmed meetings.
          </LegalLi>
          <LegalLi>
            To prevent scheduling conflicts by checking your connected calendar
            before confirming bookings.
          </LegalLi>
          <LegalLi>
            To deliver in-app notifications about your upcoming and past
            bookings.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not use your data for advertising, profiling, or any purpose
          beyond operating the scheduling service described above.
        </LegalP>
      </LegalSection>

      <LegalSection id="calendar-data" title="Calendar Data">
        <LegalHighlight>
          Calendar access is read-only. We check your existing events to hide
          busy slots — we never read event titles, attendees, or descriptions.
        </LegalHighlight>
        <LegalP>
          When you connect Google Calendar, Schduled requests access to your
          calendar in order to:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Read free/busy status to block slots where you already have
            commitments.
          </LegalLi>
          <LegalLi>
            Write new calendar events when a booking is confirmed (host and
            invitee both receive an event).
          </LegalLi>
          <LegalLi>
            Delete or update those events when a booking is cancelled or
            rescheduled.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not read, store, or transmit the content of your existing
          calendar events. We only check whether a time slot is free or busy.
          Your OAuth access token is stored encrypted at rest using AES-GCM
          encryption and is never logged.
        </LegalP>
      </LegalSection>

      <LegalSection id="storage-security" title="Storage & Security">
        <LegalP>
          All data is stored in a PostgreSQL database. We apply the following
          security measures:
        </LegalP>
        <LegalUl>
          <LegalLi>
            OAuth tokens (Google, Zoom) are encrypted at rest with AES-GCM
            before storage.
          </LegalLi>
          <LegalLi>
            All connections to Schduled use HTTPS / TLS in transit.
          </LegalLi>
          <LegalLi>
            Passwords are not stored — we use email magic links and Google OAuth
            exclusively.
          </LegalLi>
          <LegalLi>
            Database access is restricted to application servers only; no direct
            public access.
          </LegalLi>
          <LegalLi>
            Sensitive operations are logged in an immutable audit trail for
            security review.
          </LegalLi>
        </LegalUl>
        <LegalP>
          Files uploaded during onboarding (such as profile photos) are stored
          locally on our server when using the default storage driver. No
          third-party cloud storage is used unless explicitly configured by your
          administrator.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party" title="Third-Party Services">
        <LegalP>
          Schduled integrates with the following third-party services. Each has
          its own privacy policy that applies to data processed through that
          service:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="text-base-content">Google</strong> — used for
            Google OAuth sign-in and Google Calendar integration. Governed by{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://policies.google.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google Privacy Policy
            </a>
            .
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Zoom</strong> — used to
            generate Zoom meeting links when the host has connected their Zoom
            account. Governed by{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://explore.zoom.us/en/privacy/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Zoom Privacy Policy
            </a>
            .
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">SMTP provider</strong> —
            transactional emails (confirmations, reminders) are sent through
            your configured SMTP server.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not use analytics platforms, ad networks, or tracking pixels on
          any part of Schduled.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-rights" title="Your Rights">
        <LegalP>
          Depending on your jurisdiction, you may have the following rights
          regarding your personal data:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="text-base-content">Access</strong> — request a
            copy of the personal data we hold about you.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Correction</strong> — ask us
            to correct inaccurate information.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Deletion</strong> — request
            that we delete your account and all associated data. You can do this
            at any time from your Account Settings page.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Portability</strong> — request
            your data in a structured, machine-readable format.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">
              Revoke calendar access
            </strong>{" "}
            — disconnect your Google or Zoom account at any time from the
            Integrations settings page.
          </LegalLi>
        </LegalUl>
        <LegalP>
          To exercise any of these rights, contact us at the address in the
          Contact section below.
        </LegalP>
      </LegalSection>

      <LegalSection id="data-retention" title="Data Retention">
        <LegalP>
          We retain your data for as long as your account is active. If you
          delete your account:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Your profile, event types, and availability rules are deleted
            immediately.
          </LegalLi>
          <LegalLi>
            Booking records for past meetings are retained for 90 days for
            invitees who need to reference them, then permanently deleted.
          </LegalLi>
          <LegalLi>
            Audit logs are retained for 12 months for security and compliance
            purposes, then deleted.
          </LegalLi>
          <LegalLi>
            OAuth tokens are revoked and deleted upon disconnection or account
            deletion.
          </LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <LegalP>
          If you have questions about this Privacy Policy, how we handle your
          data, or wish to exercise your rights, please contact us:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Email:{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href={`mailto:${env.PRIVACY_EMAIL}`}
            >
              {env.PRIVACY_EMAIL}
            </a>
          </LegalLi>
        </LegalUl>
        <LegalP>
          We aim to respond to all privacy requests within 5 business days. We
          reserve the right to update this policy from time to time. Any
          material changes will be communicated via email or a prominent notice
          on the site.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
