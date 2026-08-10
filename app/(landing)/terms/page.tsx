import {
  LegalHighlight,
  LegalLi,
  LegalP,
  LegalSection,
  LegalShell,
  LegalUl,
  type TocEntry,
} from "@/components/landing/legal-shell";

export const metadata = {
  title: "Terms of Service — Schduled",
  description:
    "The terms governing your use of the Schduled scheduling platform.",
};

const TOC: TocEntry[] = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "service", label: "Service Description" },
  { id: "accounts", label: "Account Responsibilities" },
  { id: "booking", label: "Booking & Scheduling" },
  { id: "prohibited", label: "Prohibited Uses" },
  { id: "ip", label: "Intellectual Property" },
  { id: "availability", label: "Service Availability" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalShell
      description="By using Schduled you agree to these terms. Please read them carefully — they're written in plain English without unnecessary legalese."
      eyebrow="Legal"
      lastUpdated="June 2026"
      title="Terms of Service"
      toc={TOC}
    >
      <LegalHighlight>
        Short version: Use Schduled responsibly and in good faith. Don't abuse
        the service or use it to harass others. We may suspend accounts that
        violate these terms.
      </LegalHighlight>

      <LegalSection id="acceptance" title="Acceptance of Terms">
        <LegalP>
          By accessing or using Schduled ("the Service"), you agree to be bound
          by these Terms of Service. If you do not agree to these terms, do not
          use the Service.
        </LegalP>
        <LegalP>
          These terms apply to all visitors, users, and others who access or use
          Schduled — whether as a host (someone who sets up a booking page) or
          as an invitee (someone who books time through a host's page).
        </LegalP>
      </LegalSection>

      <LegalSection id="service" title="Service Description">
        <LegalP>
          Schduled is a scheduling platform that lets users ("hosts") create a
          public booking page. Invitees can visit that page, select an available
          time slot, and confirm a meeting. The Service includes:
        </LegalP>
        <LegalUl>
          <LegalLi>
            A customisable booking page accessible at a unique URL.
          </LegalLi>
          <LegalLi>
            Availability management and calendar conflict detection.
          </LegalLi>
          <LegalLi>
            Automatic confirmation, reminder, and cancellation emails.
          </LegalLi>
          <LegalLi>
            Optional video conferencing links (Google Meet, Zoom).
          </LegalLi>
          <LegalLi>
            ICS calendar invitations attached to confirmation emails.
          </LegalLi>
        </LegalUl>
        <LegalP>
          Schduled is provided free of charge with no feature limitations. We
          reserve the right to introduce optional paid features in the future,
          but all existing functionality will remain free.
        </LegalP>
      </LegalSection>

      <LegalSection id="accounts" title="Account Responsibilities">
        <LegalP>When you create an account, you are responsible for:</LegalP>
        <LegalUl>
          <LegalLi>
            Maintaining the security of your account and any connected
            integrations (Google, Zoom).
          </LegalLi>
          <LegalLi>All activity that occurs under your account.</LegalLi>
          <LegalLi>
            Ensuring the contact information in your profile is accurate.
          </LegalLi>
          <LegalLi>
            Honouring bookings made by invitees through your scheduling page.
          </LegalLi>
          <LegalLi>
            Keeping your availability settings up to date to avoid misleading
            invitees.
          </LegalLi>
        </LegalUl>
        <LegalP>
          You must be at least 16 years old to create an account. By
          registering, you confirm you meet this requirement.
        </LegalP>
      </LegalSection>

      <LegalSection id="booking" title="Booking & Scheduling">
        <LegalP>
          The following rules apply to the booking and scheduling features:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Hosts are responsible for configuring accurate availability hours
            and keeping their connected calendar current.
          </LegalLi>
          <LegalLi>
            Confirmed bookings create a mutual commitment between host and
            invitee. Schduled facilitates the booking but is not a party to any
            agreement between them.
          </LegalLi>
          <LegalLi>
            Invitees may reschedule or cancel through the links provided in
            their confirmation email within any deadline configured by the host.
          </LegalLi>
          <LegalLi>
            Schduled uses idempotency controls to prevent duplicate bookings;
            however, edge cases in network conditions may require hosts to
            verify their booking list.
          </LegalLi>
          <LegalLi>
            Bookings made through Schduled are not legally binding contracts.
            The platform is a scheduling convenience tool only.
          </LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection id="prohibited" title="Prohibited Uses">
        <LegalP>You may not use Schduled for any of the following:</LegalP>
        <LegalUl>
          <LegalLi>
            Creating fake booking pages to harvest personal data from
            unsuspecting invitees.
          </LegalLi>
          <LegalLi>
            Sending spam, phishing messages, or unsolicited communications via
            booking confirmation emails.
          </LegalLi>
          <LegalLi>
            Automating large numbers of booking requests to disrupt a host's
            calendar or the platform infrastructure.
          </LegalLi>
          <LegalLi>
            Impersonating another person or organisation in your booking page
            name or event descriptions.
          </LegalLi>
          <LegalLi>
            Attempting to access other users' accounts, data, or private booking
            pages without authorisation.
          </LegalLi>
          <LegalLi>
            Reverse engineering, decompiling, or otherwise attempting to extract
            source code beyond what is publicly available.
          </LegalLi>
          <LegalLi>
            Any activity that violates applicable local, national, or
            international laws or regulations.
          </LegalLi>
        </LegalUl>
        <LegalP>
          Violation of these rules may result in immediate account suspension
          without prior notice.
        </LegalP>
      </LegalSection>

      <LegalSection id="ip" title="Intellectual Property">
        <LegalP>
          The Schduled name, logo, and underlying software are the intellectual
          property of Schduled and its contributors. The core application code
          is made available under an open-source licence — please refer to the
          repository for the specific licence terms.
        </LegalP>
        <LegalP>
          Content you create within Schduled (event type names, descriptions,
          custom questions, and booking answers) remains yours. By using the
          Service, you grant Schduled a limited licence to store, process, and
          display this content solely for the purpose of providing the
          scheduling service to you and your invitees.
        </LegalP>
      </LegalSection>

      <LegalSection id="availability" title="Service Availability">
        <LegalP>
          We aim to provide a reliable service but cannot guarantee
          uninterrupted availability. Schduled may be temporarily unavailable
          due to:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Scheduled maintenance windows (announced in advance where possible).
          </LegalLi>
          <LegalLi>
            Unexpected infrastructure failures beyond our control.
          </LegalLi>
          <LegalLi>
            Security incidents requiring emergency intervention.
          </LegalLi>
          <LegalLi>
            Third-party service outages (Google, Zoom, email providers).
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not offer a service-level agreement (SLA) for the free tier.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of Liability">
        <LegalP>
          To the maximum extent permitted by applicable law, Schduled is
          provided "as is" and "as available" without any warranties, express or
          implied.
        </LegalP>
        <LegalP>
          In no event will Schduled, its developers, contributors, or operators
          be liable for any indirect, incidental, special, consequential, or
          punitive damages arising from your use of or inability to use the
          Service — including missed meetings, lost business, or data loss.
        </LegalP>
        <LegalHighlight>
          Because Schduled is a free service, our aggregate liability to you for
          any claims arising from use of the Service is limited to €0. If this
          limitation is unacceptable to you, please do not use the Service.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <LegalP>
          You may delete your account at any time from the Account Settings
          page. All your data will be removed in accordance with our Privacy
          Policy.
        </LegalP>
        <LegalP>
          We reserve the right to suspend or permanently terminate accounts
          that:
        </LegalP>
        <LegalUl>
          <LegalLi>Violate these Terms of Service.</LegalLi>
          <LegalLi>Engage in abusive, fraudulent, or illegal activity.</LegalLi>
          <LegalLi>
            Cause harm to other users or to the platform's reliability.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We will make reasonable efforts to notify you before termination
          unless doing so would pose a security risk or legal liability.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes" title="Changes to Terms">
        <LegalP>
          We may revise these Terms of Service from time to time. When we make
          material changes, we will update the "Last updated" date at the top of
          this page and, where practical, notify active users by email.
        </LegalP>
        <LegalP>
          Your continued use of Schduled after changes are posted constitutes
          acceptance of the revised terms. If you disagree with updated terms,
          your only recourse is to stop using the Service and delete your
          account.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <LegalP>
          If you have any questions about these Terms, please reach out:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Email:{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="mailto:legal@schduled.com"
            >
              legal@schduled.com
            </a>
          </LegalLi>
        </LegalUl>
      </LegalSection>
    </LegalShell>
  );
}
