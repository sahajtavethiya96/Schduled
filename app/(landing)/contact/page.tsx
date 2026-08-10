import {
  ArrowRight,
  ArrowUpRight,
  ChatCircle,
  Clock,
  EnvelopeSimple,
  GithubLogo,
  Question,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { Reveal } from "@/components/landing/reveal";
import { PRODUCT_NAME } from "@/config/platform";
import { env } from "@/lib/env";
import { ContactForm } from "./_components/contact-form";

export const metadata = {
  title: `Contact — ${PRODUCT_NAME}`,
  description: `Get in touch with the ${PRODUCT_NAME} team. We're happy to help.`,
};

const DARK_BG: React.CSSProperties = {
  background: `
    radial-gradient(circle at top right, rgba(20,184,166,.18) 0%, transparent 55%),
    radial-gradient(circle at bottom left, rgba(13,148,136,.10) 0%, transparent 55%),
    linear-gradient(180deg, #081C1C 0%, #041010 100%)
  `,
};

// Same fallback chain as app/actions/contact.ts, so the displayed address
// stays in sync with where messages sent through this form actually go.
const GENERAL_ENQUIRIES_EMAIL =
  env.CONTACT_EMAIL ?? env.SMTP_USER ?? "hello@schduled.com";

const CHANNELS = [
  {
    icon: EnvelopeSimple,
    title: "General Enquiries",
    description:
      "Questions about the product, pricing (there isn't any), or anything else.",
    link: `mailto:${GENERAL_ENQUIRIES_EMAIL}`,
    linkLabel: GENERAL_ENQUIRIES_EMAIL,
  },
  {
    icon: ShieldCheck,
    title: "Privacy & Data",
    description:
      "Data requests, account deletion, or concerns about how we handle your information.",
    link: `mailto:${env.PRIVACY_EMAIL}`,
    linkLabel: env.PRIVACY_EMAIL,
  },
  {
    icon: GithubLogo,
    title: "Bug Reports",
    description: "Found a bug? Open an issue on GitHub. We review every one.",
    link: "https://github.com",
    linkLabel: "Open an issue",
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-base-100 text-base-content antialiased">
      <LandingHeader />

      <main>
        <section
          className="relative overflow-hidden py-20 sm:py-28"
          style={DARK_BG}
        >
          <div
            className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px]"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(20,184,166,.2) 0%, transparent 60%)",
              filter: "blur(50px)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <Reveal>
            <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
              <div className="mb-7 inline-flex items-center gap-2 border border-teal-600/30 bg-teal-950/60 px-4 py-1.5 text-xs font-semibold text-teal-300">
                <ChatCircle size={13} weight="bold" />
                We reply within 2 business days
              </div>
              <h1 className="font-black text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                Let's talk.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/50">
                Have a question, found a bug, or just want to say hi? Pick the
                right channel below or use the form and we'll get back to you.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="py-16 border-b border-base-300">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {CHANNELS.map((c, i) => {
                const Icon = c.icon;
                return (
                  <Reveal delay={i * 80} key={c.title}>
                    <div className="group relative overflow-hidden border border-base-300 bg-base-100 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 h-full">
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary to-teal-400 scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />

                      <div className="mb-4 flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                        <Icon size={20} weight="duotone" />
                      </div>
                      <p className="mb-1 font-bold text-sm">{c.title}</p>
                      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                        {c.description}
                      </p>
                      <a
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-70"
                        href={c.link}
                        rel={c.external ? "noopener noreferrer" : undefined}
                        target={c.external ? "_blank" : undefined}
                      >
                        {c.linkLabel}
                        {c.external && <ArrowUpRight size={12} />}
                      </a>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-16 lg:grid-cols-[1fr_400px] lg:items-start">
              <Reveal>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-eyebrow text-primary">
                    Send a message
                  </p>
                  <h2 className="mb-8 font-black text-2xl">
                    Drop us a note and we'll get back to you.
                  </h2>
                  <ContactForm />
                </div>
              </Reveal>

              <Reveal className="space-y-6" delay={160}>
                <div className="border border-base-300 bg-base-100 p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center bg-primary/10 text-primary">
                      <Clock size={18} weight="duotone" />
                    </div>
                    <p className="font-bold text-sm">Response Time</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We aim to respond to all messages within{" "}
                    <strong className="text-base-content">
                      2 business days
                    </strong>
                    . Complex issues may take a little longer.
                  </p>
                </div>

                <div className="border border-base-300 bg-base-100 p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center bg-primary/10 text-primary">
                      <Question size={18} weight="duotone" />
                    </div>
                    <p className="font-bold text-sm">Quick Answers</p>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    Many common questions are already answered in our FAQ — it's
                    worth checking first.
                  </p>
                  <Link
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-75"
                    href="/#faq"
                  >
                    Browse the FAQ
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                </div>

                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-primary to-primary/80">
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-20"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
                    }}
                  />
                  <p className="font-bold text-sm text-white">
                    Schduled is free forever.
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                    No plans. No hidden charges. No "upgrade to unlock" prompts.
                    If you're here to ask about pricing — the answer is $0.
                  </p>
                  <Link
                    className="mt-4 inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                    href="/login"
                  >
                    Get started free
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
