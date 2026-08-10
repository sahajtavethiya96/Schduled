import {
  LegalHighlight,
  LegalLi,
  LegalP,
  LegalSection,
  LegalShell,
  LegalTable,
  LegalUl,
  type TocEntry,
} from "@/components/landing/legal-shell";
import { env } from "@/lib/env";

export const metadata = {
  title: "Cookie Policy — Schduled",
  description:
    "How Schduled uses cookies and similar technologies, and how to control them.",
};

const TOC: TocEntry[] = [
  { id: "what-are-cookies", label: "What Are Cookies" },
  { id: "how-we-use", label: "How We Use Cookies" },
  { id: "essential", label: "Essential Cookies" },
  { id: "functional", label: "Functional Cookies" },
  { id: "no-analytics", label: "What We Don't Use" },
  { id: "managing", label: "Managing Cookies" },
  { id: "contact", label: "Contact Us" },
];

export default function CookiesPage() {
  return (
    <LegalShell
      description="Schduled uses a minimal set of cookies — only what's strictly necessary to keep you signed in and the service working correctly."
      eyebrow="Legal"
      lastUpdated="June 2026"
      title="Cookie Policy"
      toc={TOC}
    >
      <LegalHighlight>
        Short version: We only use essential session cookies and a small number
        of functional cookies. We have no advertising, tracking, or analytics
        cookies. You can manage or clear cookies through your browser at any
        time.
      </LegalHighlight>

      <LegalSection id="what-are-cookies" title="What Are Cookies">
        <LegalP>
          Cookies are small text files that a website stores in your browser
          when you visit. They allow the site to remember information between
          page loads — such as whether you're logged in — so you don't have to
          re-authenticate on every click.
        </LegalP>
        <LegalP>
          Cookies are not programs; they cannot run code or install software.
          They simply store small pieces of data that the browser sends back to
          the server with each request.
        </LegalP>
        <LegalP>
          Similar technologies — such as <em>localStorage</em> and{" "}
          <em>sessionStorage</em> — work in the same way and may also be used to
          temporarily remember UI state (such as which tab you last had open).
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-use" title="How We Use Cookies">
        <LegalP>
          Schduled uses cookies and browser storage for two purposes only:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="text-base-content">Authentication</strong> —
            keeping you signed in across page navigations without requiring you
            to log in again.
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Preferences</strong> —
            remembering small UI preferences (such as the last selected timezone
            or notification state) to improve your experience.
          </LegalLi>
        </LegalUl>
        <LegalP>
          We do not use cookies for advertising, cross-site tracking, or
          building user profiles.
        </LegalP>
      </LegalSection>

      <LegalSection id="essential" title="Essential Cookies">
        <LegalP>
          Essential cookies are required for the core functionality of Schduled.
          Without them, you cannot stay signed in or use the application. These
          cookies cannot be disabled while using the service.
        </LegalP>
        <LegalTable
          headers={["Cookie Name", "Purpose", "Expires"]}
          rows={[
            [
              "better-auth.session_token",
              "Stores your encrypted session token to keep you authenticated",
              "30 days",
            ],
            [
              "better-auth.session_data",
              "Cached session metadata for fast page loads without a database round-trip",
              "60 seconds",
            ],
            [
              "__Host-better-auth.csrf_token",
              "CSRF protection token to prevent cross-site request forgery attacks",
              "Session",
            ],
          ]}
        />
        <LegalP>
          These cookies are set by the Schduled server (first-party) and are not
          accessible to third-party scripts.
        </LegalP>
      </LegalSection>

      <LegalSection id="functional" title="Functional Cookies & Storage">
        <LegalP>
          Functional cookies and browser storage are used to remember small
          preferences that improve usability. These are entirely optional in the
          sense that the core scheduling service works without them — you may
          simply see a less personalised experience.
        </LegalP>
        <LegalTable
          headers={["Storage Key", "Type", "Purpose", "Expires"]}
          rows={[
            [
              "schduled_tz_override",
              "localStorage",
              "Remembers if you manually overrode the auto-detected timezone on a booking page",
              "Until cleared",
            ],
            [
              "theme",
              "localStorage",
              "Stores your colour scheme preference (light/dark), managed by the next-themes library",
              "Until cleared",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="no-analytics" title="What We Don't Use">
        <LegalHighlight>
          Schduled has no analytics trackers, advertising cookies, or
          third-party tracking scripts of any kind.
        </LegalHighlight>
        <LegalP>
          We do not use — and have never used — any of the following:
        </LegalP>
        <LegalUl>
          <LegalLi>
            Google Analytics, Plausible, Mixpanel, Amplitude, or any analytics
            platform.
          </LegalLi>
          <LegalLi>
            Facebook Pixel, Google Ads, or any advertising retargeting cookies.
          </LegalLi>
          <LegalLi>Hotjar, FullStory, or session recording tools.</LegalLi>
          <LegalLi>
            Any third-party script that tracks your behaviour across websites.
          </LegalLi>
        </LegalUl>
        <LegalP>
          Because we don't use analytics, we don't display a cookie consent
          banner — there's nothing to consent to beyond the essential cookies
          required to run the service.
        </LegalP>
      </LegalSection>

      <LegalSection id="managing" title="Managing Cookies">
        <LegalP>
          You can control and manage cookies through your browser settings.
          Here's how to access cookie settings in common browsers:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="text-base-content">Chrome</strong> — Settings →
            Privacy and security → Cookies and other site data
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Firefox</strong> — Settings →
            Privacy &amp; Security → Cookies and Site Data
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Safari</strong> — Preferences
            → Privacy → Manage Website Data
          </LegalLi>
          <LegalLi>
            <strong className="text-base-content">Edge</strong> — Settings →
            Cookies and site permissions → Manage and delete cookies
          </LegalLi>
        </LegalUl>
        <LegalP>
          Please note: clearing or blocking the authentication session cookie
          will sign you out of Schduled and you will need to log in again.
          Clearing localStorage preferences will reset any UI overrides you've
          set.
        </LegalP>
        <LegalP>
          If you'd like to sign out and clear all session data, use the Sign Out
          option in your account menu — this invalidates the server-side session
          immediately.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <LegalP>
          If you have any questions about how Schduled uses cookies, please get
          in touch:
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
          This policy may be updated to reflect changes in how the Service
          operates. Any changes will be noted with an updated "Last updated"
          date at the top of this page.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
