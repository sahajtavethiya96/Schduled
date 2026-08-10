import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Code,
  Globe,
  Heart,
  Lightning,
  LockSimple,
  Rocket,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { Reveal } from "@/components/landing/reveal";

export const metadata = {
  title: "About — Schduled",
  description:
    "Schduled was built out of frustration with overpriced scheduling tools. Here's our story.",
};

const DARK_BG: React.CSSProperties = {
  background: `
    radial-gradient(circle at top right, rgba(20,184,166,.18) 0%, transparent 55%),
    radial-gradient(circle at bottom left, rgba(13,148,136,.10) 0%, transparent 55%),
    linear-gradient(180deg, #081C1C 0%, #041010 100%)
  `,
};

const VALUES = [
  {
    icon: Lightning,
    title: "Radical Simplicity",
    description:
      "Every feature decision starts with the question: does this make scheduling simpler? If it adds friction, it doesn't ship.",
  },
  {
    icon: LockSimple,
    title: "Privacy First",
    description:
      "No analytics trackers. No ad networks. No selling your data. Your calendar data stays yours — period.",
  },
  {
    icon: Code,
    title: "Open Source",
    description:
      "Schduled is open source. Read the code, audit the security model, self-host it. We believe in transparency.",
  },
  {
    icon: Heart,
    title: "Free Forever",
    description:
      "Not a marketing claim. There is no paid tier, no feature lock, no expiring trial. Every feature ships free.",
  },
];

const STATS = [
  { value: "2 min", label: "Average setup time" },
  { value: "0", label: "Pricing tiers" },
  { value: "100%", label: "Features included free" },
  { value: "∞", label: "Bookings per month" },
];

const TEAM = [
  {
    initials: "DH",
    name: "Dev Team",
    role: "Engineering & Design",
    gradient: "from-teal-500 to-emerald-600",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-base-100 text-base-content antialiased">
      <LandingHeader />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden py-24 sm:py-36"
          style={DARK_BG}
        >
          {/* Orbs */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px]"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(20,184,166,.2) 0%, transparent 60%)",
              filter: "blur(50px)",
            }}
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-[400px] w-[400px]"
            style={{
              background:
                "radial-gradient(circle at bottom left, rgba(13,148,136,.12) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          {/* Grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
            <div className="mb-7 inline-flex items-center gap-2.5 border border-teal-600/30 bg-teal-950/60 px-3.5 py-1.5 text-xs font-semibold text-teal-300">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-teal-400" />
              </span>
              Open source · Free forever
            </div>

            <h1 className="font-black text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Scheduling that puts
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#2dd4bf 0%,#14b8a6 28%,#5eead4 55%,#0f9688 80%,#2dd4bf 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundSize: "200% auto",
                  display: "inline-block",
                }}
              >
                you in control.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/55">
              Schduled was built because scheduling shouldn't cost $16/month. A
              booking link, calendar sync, and email reminders should be free —
              and private. So we built it.
            </p>
          </div>
        </section>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <section className="border-b border-base-300">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid divide-y divide-base-300 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal
                  className="px-8 py-10 text-center"
                  delay={i * 80}
                  key={s.label}
                >
                  <p
                    className="font-black text-4xl"
                    style={{
                      background:
                        "linear-gradient(90deg,#0d9488 0%,#14b8a6 45%,#2dd4bf 75%,#0d9488 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      backgroundSize: "200% auto",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    {s.label}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Origin story ───────────────────────────────────────────────── */}
        <section className="py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              {/* Copy */}
              <Reveal>
                <div>
                  <p className="mb-4 text-xs font-black uppercase tracking-eyebrow text-primary">
                    Our Story
                  </p>
                  <h2 className="mb-6 font-black text-3xl leading-snug sm:text-4xl">
                    Born out of frustration
                    <br />
                    with paywalled tools.
                  </h2>
                  <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      We used Calendly. Then they started putting basic features
                      behind a $12/month plan. Then $16. Then they added a
                      per-seat model for teams. A tool that takes 5 minutes to
                      set up shouldn't require a subscription.
                    </p>
                    <p>
                      So we built Schduled — a full-featured scheduling tool
                      with zero feature gates. Calendar sync, timezone
                      detection, email reminders, video links, custom questions,
                      rescheduling and cancellation flows — all of it,
                      completely free.
                    </p>
                    <p>
                      We also made it open source. If you don't trust us with
                      your calendar data, you can read every line of code. Or
                      self-host it entirely. That's the deal.
                    </p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
                      href="/login"
                    >
                      Start for free
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                    <a
                      className="inline-flex items-center gap-2 border border-base-300 px-5 py-2.5 text-sm font-medium text-base-content transition-colors hover:border-primary/40 hover:text-primary"
                      href="https://github.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View on GitHub
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </Reveal>

              {/* Visual timeline */}
              <Reveal className="space-y-0" delay={160}>
                {[
                  {
                    icon: Rocket,
                    heading: "The problem",
                    body: "Every existing scheduling tool hides useful features behind monthly subscriptions. We decided to fix that.",
                    accent: true,
                  },
                  {
                    icon: Code,
                    heading: "The build",
                    body: "Built with Next.js, PostgreSQL, and pg-boss. No magic — just good engineering and sharp product thinking.",
                    accent: false,
                  },
                  {
                    icon: Globe,
                    heading: "The result",
                    body: "A scheduling tool that's faster to set up than Calendly, completely free, and fully open source.",
                    accent: false,
                  },
                  {
                    icon: Heart,
                    heading: "The promise",
                    body: "We will never introduce feature paywalls. If we ever monetise, it will be for genuinely new capabilities only.",
                    accent: false,
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div className="group relative flex gap-5" key={i}>
                      {/* Vertical line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center border ${item.accent ? "border-primary bg-primary text-primary-content" : "border-base-300 bg-base-100 text-primary"}`}
                        >
                          <Icon size={18} weight="duotone" />
                        </div>
                        {i < 3 && (
                          <div
                            className="mt-1 w-px flex-1 border-l border-dashed border-base-300"
                            style={{ minHeight: "2rem" }}
                          />
                        )}
                      </div>

                      <div className="pb-8">
                        <p className="font-bold text-base-content">
                          {item.heading}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Values ─────────────────────────────────────────────────────── */}
        <section className="border-t border-base-300 bg-base-200/20 py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <div className="mb-16 text-center">
                <p className="mb-3 text-xs font-black uppercase tracking-eyebrow text-primary">
                  What we stand for
                </p>
                <h2 className="font-black text-3xl sm:text-4xl">
                  Four values.
                  <br className="hidden sm:block" /> Everything else follows.
                </h2>
              </div>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <Reveal delay={i * 80} key={v.title}>
                    <div className="group relative overflow-hidden border border-base-300 bg-base-100 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 h-full">
                      {/* Top accent line */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary to-teal-400 scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                      {/* Hover glow */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <div className="relative">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                          <Icon size={22} weight="duotone" />
                        </div>
                        <h3 className="mb-2 font-bold text-base">{v.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {v.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Open source callout ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-28" style={DARK_BG}>
          {/* Grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <div>
                  <p className="mb-4 text-xs font-black uppercase tracking-eyebrow text-teal-400/60">
                    Open Source
                  </p>
                  <h2 className="font-black text-3xl text-white sm:text-4xl">
                    Read every line.
                    <br />
                    Trust nothing blindly.
                  </h2>
                  <p className="mt-5 text-white/50 leading-relaxed">
                    We believe privacy tools should be verifiable. Schduled's
                    source code is publicly available. If you'd prefer full
                    control, self-host it on your own infrastructure in minutes.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      className="inline-flex items-center gap-2 border border-teal-600/40 bg-teal-950/60 px-5 py-2.5 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-950"
                      href="https://github.com"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View Source on GitHub
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </Reveal>

              {/* Code snippet visual */}
              <Reveal delay={160}>
                <div
                  className="border border-white/10 font-mono text-xs"
                  style={{
                    background: "linear-gradient(145deg,#0d1f1a,#091512)",
                  }}
                >
                  <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500/40" />
                      <div className="h-2 w-2 rounded-full bg-amber-500/40" />
                      <div className="h-2 w-2 rounded-full bg-green-500/40" />
                    </div>
                    <span className="ml-2 text-white/25 text-xs">
                      app/api/bookings/route.ts
                    </span>
                  </div>
                  <div className="p-5 space-y-1 text-xs leading-relaxed">
                    <div>
                      <span className="text-teal-400/70">
                        export async function
                      </span>{" "}
                      <span className="text-white/80">POST</span>
                      <span className="text-white/40">
                        (request: Request) {"{"}
                      </span>
                    </div>
                    <div className="pl-4">
                      <span className="text-white/40">
                        // Idempotency check — prevent duplicate bookings
                      </span>
                    </div>
                    <div className="pl-4">
                      <span className="text-teal-400/70">const</span>{" "}
                      <span className="text-white/70">existing</span>{" "}
                      <span className="text-white/40">= await db.select()</span>
                    </div>
                    <div className="pl-8">
                      <span className="text-white/40">
                        .from(idempotencyKey)
                      </span>
                    </div>
                    <div className="pl-8">
                      <span className="text-white/40">
                        .where(eq(key, idemKey));
                      </span>
                    </div>
                    <div className="pl-4 mt-2">
                      <span className="text-teal-400/70">if</span>{" "}
                      <span className="text-white/40">
                        (existing?.result) {"{"}
                      </span>
                    </div>
                    <div className="pl-8">
                      <span className="text-teal-400/70">return</span>{" "}
                      <span className="text-white/40">NextResponse.json(</span>
                    </div>
                    <div className="pl-12">
                      <span className="text-white/40">
                        JSON.parse(existing.result)
                      </span>
                    </div>
                    <div className="pl-8">
                      <span className="text-white/40">);</span>
                    </div>
                    <div className="pl-4 text-white/40">{"}"}</div>
                    <div className="text-white/40">{"}"}</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section className="py-28">
          <Reveal>
            <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
              <p className="mb-4 text-xs font-black uppercase tracking-eyebrow text-primary">
                Ready?
              </p>
              <h2 className="font-black text-3xl sm:text-4xl">
                Your booking link is
                <br className="hidden sm:block" />
                two minutes away.
              </h2>
              <p className="mt-4 text-muted-foreground">
                No credit card. No trial. No paid tiers. Just sign up, connect
                your calendar, and share your link.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
                  href="/login"
                >
                  Start for free
                  <ArrowRight size={14} weight="bold" />
                </Link>
                <Link
                  className="inline-flex items-center gap-2 border border-base-300 px-8 py-3.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                  href="/contact"
                >
                  Get in touch
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {["No credit card", "Free forever", "Open source"].map((t) => (
                  <span
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    key={t}
                  >
                    <CheckCircle
                      className="text-primary"
                      size={13}
                      weight="fill"
                    />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
