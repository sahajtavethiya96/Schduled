import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FaqAccordion } from '@/components/landing/faq-accordion'
import { FeaturesSection } from '@/components/landing/features-section'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingFooter } from '@/components/landing/landing-footer'
import { Reveal } from '@/components/landing/reveal'
import { env } from '@/lib/env'
import { getAppUrl } from '@/lib/get-app-url'

// Illustrative example domain shown in "how it works" copy — derives from
// the real configured deployment so self-hosters see their own domain
// instead of the hosted product's.
const APP_HOST = getAppUrl().replace(/^https?:\/\//, '')
import {
  ArrowDown,
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  Code,
  CodeSimple,
  Database,
  Globe,
  Lightning,
  LinkSimple,
  PaintBrush,
  ShieldCheck,
  Stack,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr'
import { getCurrentSession } from '@/lib/authz'
import { redirectToSetupIfNeeded } from '@/lib/setup'

export const metadata = {
  title: 'Schduled — Smart scheduling for modern teams',
  description: 'Share a link. Let people book time with you automatically. No back-and-forth emails.',
}

// Never statically prerender: redirectToSetupIfNeeded() hits the database on
// every visit (first-run setup gate) — that must run per-request, not once
// at build time.
export const dynamic = 'force-dynamic'

// ── Static data ───────────────────────────────────────────────────────────────

/* The real, open-source stack this project actually runs on (see README.md) */
const TECH_STACK = [
  { id: 'nextjs', icon: Lightning, label: 'Next.js' },
  { id: 'typescript', icon: CodeSimple, label: 'TypeScript' },
  { id: 'postgresql', icon: Database, label: 'PostgreSQL' },
  { id: 'tailwind', icon: PaintBrush, label: 'Tailwind CSS' },
  { id: 'better-auth', icon: ShieldCheck, label: 'Better Auth' },
  { id: 'drizzle', icon: Stack, label: 'Drizzle ORM' },
]

const STEPS = [
  {
    num: '01',
    icon: Clock,
    title: 'Set your availability',
    description: 'Choose working hours, buffer times, and connect your calendar. Takes 2 minutes total.',
    detail: 'Mon–Fri, 9AM–5PM · Auto-blocked when busy',
  },
  {
    num: '02',
    icon: LinkSimple,
    title: 'Share your booking link',
    description: `You get ${APP_HOST}/yourname. Paste it in your email signature, LinkedIn bio, or anywhere.`,
    detail: `${APP_HOST}/janedoe/30-min`,
  },
  {
    num: '03',
    icon: CalendarBlank,
    title: 'Meetings land in your calendar',
    description: 'Invitees pick a slot, fill in their info, and the event appears in both calendars with a video link.',
    detail: 'Confirmation emails sent instantly',
  },
]

const STATS = [
  { icon: Lightning,   value: '< 2 min', title: 'Setup Time',       sub: 'Get started in seconds. No config, no friction.' },
  { icon: ShieldCheck, value: '0',       title: 'Double Bookings',   sub: 'Calendar sync prevents every double-booking.' },
  { icon: LinkSimple,  value: '1 link',  title: 'Share Everywhere',  sub: 'Book meetings from anywhere you share it.' },
]

const FEATURE_GROUPS = [
  {
    label: 'Scheduling',
    icon: CalendarBlank,
    items: ['Meeting Types', 'Availability Rules', 'Booking Limits', 'Buffer Times'],
  },
  {
    label: 'Integrations',
    icon: VideoCamera,
    items: ['Google Meet', 'Zoom', 'Microsoft Teams', 'Google Calendar'],
  },
  {
    label: 'Automation',
    icon: Lightning,
    items: ['Email Reminders', 'Reschedule & Cancel', 'Custom Questions', 'ICS Downloads'],
  },
]

const FAQ_ITEMS = [
  { q: 'Is Schduled really free?', a: 'Yes — completely free. No paid plans, no credit card required, no feature limits. Every capability is available from day one, forever.', defaultOpen: true },
  { q: 'Do my invitees need to sign up?', a: 'No. Invitees open your link, pick a time, and fill in their name and email. No account, no app download, no friction at all.' },
  { q: 'How does calendar sync work?', a: 'Connect your Google Calendar once during setup. Schduled reads your existing events in real time and hides busy slots from your booking page automatically.' },
  { q: 'What happens the moment someone books?', a: 'Both you and the invitee receive a confirmation email with all details, a video link (if configured), and an .ics calendar file. Reminders fire 24 hours and 1 hour before the meeting.' },
  { q: 'How is Schduled different from Calendly?', a: "Schduled is 100% free with no plan limits, a sharper UI, and it's open source. Everything Calendly charges for on paid plans — Schduled ships free." },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const DARK_BG: React.CSSProperties = {
  background: `
    radial-gradient(circle at top right, rgba(20,184,166,.18) 0%, transparent 55%),
    radial-gradient(circle at bottom left, rgba(13,148,136,.10) 0%, transparent 55%),
    linear-gradient(180deg, #081C1C 0%, #041010 100%)
  `,
}


const PARTICLES = [
  { top: '12%', left: '8%',  size: 3, delay: '0s',   dur: '7s'   },
  { top: '22%', left: '78%', size: 2, delay: '1.2s', dur: '9s'   },
  { top: '58%', left: '12%', size: 4, delay: '2.1s', dur: '6.5s' },
  { top: '72%', left: '68%', size: 2, delay: '0.6s', dur: '8s'   },
  { top: '38%', left: '48%', size: 3, delay: '3.3s', dur: '7.5s' },
  { top: '82%', left: '38%', size: 2, delay: '1.8s', dur: '9.5s' },
  { top: '8%',  left: '52%', size: 2, delay: '4.1s', dur: '8s'   },
  { top: '48%', left: '92%', size: 3, delay: '2.7s', dur: '6s'   },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  await redirectToSetupIfNeeded()
  const session = await getCurrentSession()
  if (session) redirect('/dashboard')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const selectedDay = Math.min(today + 3, daysInMonth)
  const selectedDate = new Date(year, month, selectedDay)
  const selectedDayName = DAY_SHORT[selectedDate.getDay()]
  const selectedMonthShort = MONTH_SHORT[month]

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const calGrid: (number | null)[][] = []
  let week: (number | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { calGrid.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    calGrid.push(week)
  }

  const featStart   = today
  const featBusyDay = today + 3
  const featAvailDay = today + 7
  const todayDayName = DAY_SHORT[now.getDay()]

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground antialiased">

      {/* ─── NAVBAR ──────────────────────────────────────────────────────────── */}
      <LandingHeader />

      <main>

        {/* ─── HERO ────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pb-0 pt-20 sm:pt-28" style={DARK_BG}>

          {/* Animated gradient orbs */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] animate-schduled-glow-pulse"
            style={{ background: 'radial-gradient(circle at top right, rgba(20,184,166,.22) 0%, transparent 60%)', filter: 'blur(40px)', opacity: 0.9 }}
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-[500px] w-[500px]"
            style={{ background: 'radial-gradient(circle at bottom left, rgba(13,148,136,.14) 0%, transparent 65%)', filter: 'blur(60px)' }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px]"
            style={{ background: 'radial-gradient(ellipse, rgba(20,184,166,.06) 0%, transparent 70%)', filter: 'blur(30px)' }}
          />

          {/* Grid overlay — 10% opacity */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{ backgroundImage: 'linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />

          {/* Floating particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-teal-400 animate-schduled-particle"
                style={{
                  top: p.top, left: p.left,
                  width: p.size, height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

              {/* ── LEFT: copy ── */}
              <div className="animate-schduled-reveal">

                {/* 3 premium micro-badges */}
                <div className="mb-8 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 border border-teal-600/30 bg-teal-950/70 px-3 py-1 text-xs font-semibold text-teal-300 backdrop-blur-sm">
                    <Lightning size={10} weight="fill" /> No credit card required
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-teal-600/30 bg-teal-950/70 px-3 py-1 text-xs font-semibold text-teal-300 backdrop-blur-sm">
                    <Code size={10} weight="bold" /> Open Source
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-teal-600/30 bg-teal-950/70 px-3 py-1 text-xs font-semibold text-teal-300 backdrop-blur-sm">
                    <Globe size={10} weight="duotone" /> Timezone Smart
                  </span>
                </div>

                <h1 className="font-black text-[2.6rem] leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Scheduling that
                  <br />
                  <span
                    className="animate-schduled-text-gradient"
                    style={{
                      background: 'linear-gradient(90deg,#2dd4bf 0%,#14b8a6 28%,#5eead4 55%,#0f9688 80%,#2dd4bf 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      backgroundSize: '200% auto',
                      display: 'inline-block',
                    }}
                  >
                    just works.
                  </span>
                </h1>

                <p className="mt-6 max-w-md text-lg leading-relaxed text-white/55">
                  Share one link. Let people book time with you automatically.
                  No email threads. No calendar ping-pong. Meetings just appear.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="relative inline-flex items-center gap-2 overflow-hidden bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    <span className="animate-schduled-sheen pointer-events-none absolute inset-0"
                      style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%)', backgroundSize: '200% auto' }} />
                    Start for free
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                  <a href="#how-it-works"
                    className="inline-flex items-center gap-1.5 border border-white/12 px-7 py-3.5 text-sm font-medium text-white/65 transition-all hover:border-white/25 hover:text-white">
                    See how it works
                  </a>
                </div>

                <p className="mt-5 flex items-center gap-2 text-xs text-white/30">
                  <CheckCircle size={11} weight="fill" className="text-teal-400/60 shrink-0" /> No credit card
                  <span className="opacity-40">·</span>
                  <CheckCircle size={11} weight="fill" className="text-teal-400/60 shrink-0" /> Free forever
                  <span className="opacity-40">·</span>
                  <CheckCircle size={11} weight="fill" className="text-teal-400/60 shrink-0" /> 2-minute setup
                </p>
              </div>

              {/* ── RIGHT: booking widget ── */}
              <div className="relative flex items-start justify-center gap-4 animate-schduled-reveal" style={{ animationDelay: '200ms' }}>

                {/* Calendar picker */}
                <div
                  className="hidden w-[240px] shrink-0 border border-white/12 lg:block"
                  style={{
                    background: 'linear-gradient(145deg,#0d201a,#091512)',
                    animation: 'schduled-float 5s ease-in-out infinite',
                    animationDelay: '0.8s',
                    marginTop: '48px',
                  }}
                >
                  <div className="border-b border-white/8 px-4 py-3.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</span>
                    <div className="flex gap-1">
                      <CaretLeft size={14} className="text-white/30" />
                      <CaretRight size={14} className="text-white/30" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 grid grid-cols-7 text-center">
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <span key={i} className="text-2xs font-bold text-white/25">{d}</span>
                      ))}
                    </div>
                    {calGrid.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 text-center">
                        {week.map((day, di) => (
                          <span
                            key={di}
                            className={`my-0.5 inline-flex h-7 w-7 items-center justify-center text-xs font-medium transition-colors ${
                              day === null
                                ? ''
                                : day === selectedDay
                                ? 'bg-primary text-primary-foreground font-bold'
                                : day < today
                                ? 'text-white/20'
                                : 'cursor-default text-white/55 hover:bg-white/8'
                            }`}
                          >
                            {day ?? ''}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/8 px-4 py-3">
                    <p className="text-xs text-white/35">{selectedDayName} {selectedMonthShort} {selectedDay} · 3 slots available</p>
                  </div>
                </div>

                {/* Main booking card — 4s float */}
                <div className="relative w-full max-w-[370px] shrink-0">
                  <div
                    className="border border-white/12"
                    style={{
                      background: 'linear-gradient(145deg,#0f2118,#091512)',
                      animation: 'schduled-float 4s ease-in-out infinite',
                      animationDelay: '0s',
                    }}
                  >
                    <div className="border-b border-white/8 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/20 text-xs font-black text-teal-300">JS</div>
                        <div>
                          <p className="font-semibold text-white">Jane Smith</p>
                          <p className="text-xs text-white/40">Discovery Call · 30 min</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1 text-2xs text-teal-400/60">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-schduled-ping bg-teal-400 opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 bg-teal-400" />
                          </span>
                          Live
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-white/35">
                        <VideoCamera size={11} />
                        Google Meet · {selectedDayName}, {selectedMonthShort} {selectedDay}
                      </div>
                    </div>

                    <div className="px-6 py-5">
                      <p className="mb-3 text-2xs font-bold uppercase tracking-widest text-white/25">Select a time</p>
                      <div className="space-y-2">
                        {[
                          { t: '09:00 AM', sel: false, fade: false },
                          { t: '09:30 AM', sel: true,  fade: false },
                          { t: '10:00 AM', sel: false, fade: false },
                          { t: '10:30 AM', sel: false, fade: false },
                          { t: '11:00 AM', sel: false, fade: true  },
                        ].map(({ t, sel, fade }, i) => (
                          <div
                            key={t}
                            className={`flex cursor-default items-center justify-between px-4 py-2.5 text-sm animate-schduled-reveal ${
                              sel
                                ? 'bg-primary text-primary-foreground'
                                : `border border-white/8 text-white/55 ${fade ? 'opacity-40' : ''}`
                            }`}
                            style={{ animationDelay: `${400 + i * 70}ms` }}
                          >
                            {t}
                            {sel && <span className="flex items-center gap-1 text-xs font-medium opacity-80"><CheckCircle size={12} weight="fill" />Selected</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/8 px-6 py-5">
                      <div className="relative overflow-hidden bg-primary py-3.5 text-center text-sm font-semibold text-primary-foreground">
                        <span className="animate-schduled-sheen pointer-events-none absolute inset-0"
                          style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%)', backgroundSize: '200% auto' }} />
                        Confirm booking
                      </div>
                    </div>
                  </div>

                  {/* Toast */}
                  <div
                    className="mt-3 border border-teal-700/35 bg-teal-950/80 px-4 py-3 backdrop-blur-sm animate-schduled-reveal"
                    style={{ animationDelay: '900ms' }}
                  >
                    <div className="flex items-center gap-2.5 text-xs">
                      <CheckCircle size={15} weight="fill" className="text-teal-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-white">Booking confirmed!</p>
                        <p className="text-white/45">Invite sent · Google Meet link included</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reminder badge */}
                <div
                  className="hidden lg:block absolute -top-4 -right-4 border border-white/8 bg-white/5 px-4 py-3 backdrop-blur-sm animate-schduled-reveal"
                  style={{ animationDelay: '1050ms' }}
                >
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Bell size={12} className="text-primary/80 shrink-0" />
                    Reminder sent 1h before
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-16 h-16"
              style={{ background: 'linear-gradient(to bottom, transparent, #041010)' }} />
          </div>
        </section>

        {/* ─── TECH STACK ──────────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-background py-7">
          <Reveal className="mb-6 text-center" direction="fade">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-foreground/50">
              Built on a real open-source stack
            </p>
          </Reveal>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />
            <div className="flex animate-schduled-ticker items-center whitespace-nowrap">
              {[...TECH_STACK, ...TECH_STACK].map((tech, i) => {
                const Icon = tech.icon
                return (
                  <div
                    key={`${tech.id}-${i}`}
                    className="mx-12 inline-flex shrink-0 items-center gap-2.5 text-foreground/55 transition-colors duration-300 hover:text-foreground"
                  >
                    <Icon size={22} weight="duotone" className="text-primary" />
                    <span className="text-[19px] font-black tracking-tight">{tech.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── STATS ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-y border-border bg-muted/20">
          {/* Soft centered glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[760px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(ellipse, rgba(20,184,166,0.09) 0%, transparent 65%)', filter: 'blur(28px)' }}
          />
          {/* Faint dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(20,184,166,0.25) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">

            {/* Heading block */}
            <Reveal className="pt-14 pb-10 text-center" direction="up">
              <p className="mb-4 text-xs font-black uppercase tracking-eyebrow text-primary">
                Why people choose Schduled
              </p>
              <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
                Scheduling that{' '}
                <span
                  className="animate-schduled-text-gradient"
                  style={{
                    background: 'linear-gradient(90deg,#2dd4bf 0%,#14b8a6 28%,#5eead4 55%,#0f9688 80%,#2dd4bf 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    backgroundSize: '200% auto',
                    display: 'inline-block',
                  }}
                >
                  just works.
                </span>
              </h2>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
                Everything you need to create booking pages, eliminate double bookings,
                and share your availability in minutes.
              </p>
            </Reveal>

            {/* Stats row — each card slides in from its own direction */}
            <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
              {STATS.map((s, idx) => {
                const Icon = s.icon
                const dirs = ['left', 'up', 'right'] as const
                return (
                  <Reveal
                    key={s.value}
                    direction={dirs[idx]}
                    delay={idx * 110}
                    className="group flex flex-1 flex-col items-center px-10 py-10 text-center transition-all duration-300 hover:-translate-y-1 sm:py-14"
                  >
                    {/* Small icon badge */}
                    <div className="mb-4 flex h-8 w-8 items-center justify-center bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/18">
                      <Icon size={15} weight="duotone" />
                    </div>

                    {/* Large metric number */}
                    <div
                      className="mb-2 font-black leading-none tracking-tight animate-schduled-text-gradient"
                      style={{
                        fontSize: 'clamp(2.8rem, 4.2vw, 4.5rem)',
                        background: 'linear-gradient(90deg,#0d9488 0%,#14b8a6 45%,#2dd4bf 75%,#0d9488 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        backgroundSize: '200% auto',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {s.value}
                    </div>

                    {/* Uppercase label */}
                    <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60">
                      {s.title}
                    </p>

                    {/* Supporting sentence */}
                    <p className="max-w-[200px] text-sm leading-relaxed text-muted-foreground">
                      {s.sub}
                    </p>
                  </Reveal>
                )
              })}
            </div>

          </div>
        </section>

        {/* ─── FEATURES ────────────────────────────────────────────────────── */}
        <FeaturesSection />

        {/* ─── PRODUCT PREVIEW ─────────────────────────────────────────────────── */}
        <section className="relative overflow-clip py-32" style={DARK_BG}>
          {/* Animated radial glow behind dashboard */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] animate-schduled-glow-pulse"
            style={{ background: 'radial-gradient(ellipse,rgba(20,184,166,.40) 0%,transparent 65%)', filter: 'blur(20px)', opacity: 0.7 }}
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.032]"
            style={{ backgroundImage: 'linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

          <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
            <Reveal className="mb-14 text-center" direction="up">
              <p className="mb-3 text-xs font-black uppercase tracking-eyebrow text-teal-400/60">The product</p>
              <h2 className="font-black text-3xl text-white sm:text-4xl lg:text-5xl">
                Clean. Fast.<br className="hidden sm:block" /> Everything at a glance.
              </h2>
              <p className="mt-4 text-white/45">Your command center for every booking, every meeting, every invitee.</p>
            </Reveal>

            {/* Dashboard frame with floating labels */}
            <Reveal delay={150} direction="scale" className="relative">

              {/* Floating label — Upcoming */}
              <div
                className="absolute -left-4 top-20 z-10 hidden border border-teal-600/35 bg-teal-950/90 px-3 py-2 backdrop-blur-sm animate-schduled-reveal xl:block"
                style={{ animationDelay: '300ms', animation: 'schduled-float 5s ease-in-out 0.5s infinite' }}
              >
                <p className="text-2xs font-black uppercase tracking-wider text-teal-400/60">Upcoming</p>
                <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>10</p>
                <p className="text-2xs text-white/40">meetings this week</p>
              </div>

              {/* Floating label — Team */}
              <div
                className="absolute -right-4 top-32 z-10 hidden border border-teal-600/35 bg-teal-950/90 px-3 py-2 backdrop-blur-sm xl:block"
                style={{ animation: 'schduled-float 6s ease-in-out 1.2s infinite' }}
              >
                <p className="text-2xs font-black uppercase tracking-wider text-teal-400/60">Team</p>
                <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>4</p>
                <p className="text-2xs text-white/40">active members</p>
              </div>

              {/* Floating label — Analytics */}
              <div
                className="absolute -right-4 bottom-32 z-10 hidden border border-teal-600/35 bg-teal-950/90 px-3 py-2 backdrop-blur-sm xl:block"
                style={{ animation: 'schduled-float 7s ease-in-out 2s infinite' }}
              >
                <p className="text-2xs font-black uppercase tracking-wider text-teal-400/60">Analytics</p>
                <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>+28%</p>
                <p className="text-2xs text-white/40">bookings this month</p>
              </div>

              {/* Browser frame */}
              <div
                className="overflow-hidden border border-white/12"
                style={{}}
              >
                <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.04] px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500/45" />
                    <div className="h-2 w-2 rounded-full bg-amber-500/45" />
                    <div className="h-2 w-2 rounded-full bg-green-500/45" />
                  </div>
                  <div className="flex flex-1 max-w-xs items-center gap-2 border border-white/8 bg-black/25 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400/55" />
                    <span className="font-mono text-xs text-white/30">{APP_HOST}/dashboard</span>
                  </div>
                </div>

                <div className="flex h-[520px] sm:h-[640px]" style={{ background: '#0f1f1a' }}>

                  {/* Sidebar */}
                  <div className="hidden w-48 shrink-0 flex-col border-r border-white/8 sm:flex" style={{ background: 'oklch(0.108 0.032 215)' }}>
                    {/* Logo */}
                    <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3.5">
                      <div className="flex h-5 w-5 items-center justify-center bg-primary text-[9px] font-black text-white">S</div>
                      <span className="text-xs font-black text-white/80">Schduled</span>
                    </div>
                    <div className="flex-1 space-y-0.5 px-2 pt-3">
                      {[
                        ['Dashboard',     true ],
                        ['Meeting Types', false],
                        ['Availability',  false],
                        ['Bookings',      false],
                        ['Contacts',      false],
                        ['Settings',      false],
                      ].map(([label, active]) => (
                        <div key={label as string} className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}>
                          <div className={`h-1 w-1 ${active ? 'bg-primary' : 'bg-transparent'}`} />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/8 px-2 py-3">
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-primary/30 text-[9px] font-black text-white">DH</div>
                        <div className="min-w-0">
                          <div className="h-2 w-16 bg-white/20" />
                          <div className="mt-1 h-1.5 w-10 bg-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 overflow-hidden" style={{ background: 'oklch(0.97 0.004 85)' }}>

                    {/* Top bar */}
                    <div className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-5 py-2.5">
                      <div className="flex flex-1 items-center gap-2 border border-border bg-card px-3 py-1.5">
                        <div className="h-2.5 w-2.5 bg-muted-foreground/30" />
                        <div className="h-2 w-36 bg-muted-foreground/15" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 border border-border bg-card" />
                        <div className="h-7 w-7 border border-border bg-card" />
                        <div className="h-7 w-7 bg-primary/20" />
                      </div>
                    </div>

                    <div className="space-y-3 overflow-hidden p-5">

                      {/* Welcome + actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="h-5 w-48 bg-foreground/15" />
                          <div className="mt-1.5 h-2.5 w-64 bg-foreground/6" />
                        </div>
                        <div className="hidden items-center gap-1.5 sm:flex">
                          <div className="h-7 w-28 bg-primary" />
                          <div className="h-7 w-24 border border-border bg-card" />
                          <div className="h-7 w-24 border border-border bg-card" />
                        </div>
                      </div>

                      {/* Next meeting strip */}
                      <div className="flex items-center gap-3 border border-primary/30 bg-primary/[0.04] px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/20">
                          <Clock size={14} weight="duotone" className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-primary">Your next meeting</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <div className="h-2 w-20 bg-foreground/20" />
                            <span className="text-[9px] text-muted-foreground">· Discovery Call</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-bold text-foreground">Jul 15</p>
                          <p className="text-[9px] text-muted-foreground">10:00 AM</p>
                        </div>
                      </div>

                      {/* 5 stat cards */}
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: 'MEETING TYPES', val: '4',  sub: 'Active',       accent: false },
                          { label: 'TOTAL',         val: '24', sub: 'All time',      accent: false },
                          { label: 'UPCOMING',      val: '10', sub: 'Next: Jul 15',  accent: true  },
                          { label: 'COMPLETED',     val: '19', sub: '1 this month',  accent: false },
                          { label: 'CANCELLED',     val: '2',  sub: '0 this month',  accent: false },
                        ].map(({ label, val, sub, accent }) => (
                          <div key={label} className={`relative overflow-hidden border p-2.5 ${accent ? 'border-primary/40 bg-primary/[0.06]' : 'border-border bg-card'}`}>
                            <div className={`absolute inset-x-0 top-0 h-[2px] bg-primary ${accent ? 'opacity-100' : 'opacity-0'}`} />
                            <p className="text-[7px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
                            <p className={`mt-0.5 text-xl font-black leading-none ${accent ? 'text-primary' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-heading)' }}>{val}</p>
                            <p className="mt-0.5 text-[7px] text-muted-foreground/70">{sub}</p>
                          </div>
                        ))}
                      </div>

                      {/* Two-column lists */}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {/* Upcoming meetings */}
                        <div className="border border-border bg-card">
                          <div className="flex items-center justify-between border-b border-border px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-foreground">Upcoming Meetings</span>
                              <span className="flex h-4 min-w-4 items-center justify-center bg-primary/10 px-1 text-[8px] font-bold text-primary">3</span>
                            </div>
                            <span className="text-[9px] font-semibold text-primary">View all</span>
                          </div>
                          {[
                            { name: 'Alex Johnson', label: 'Discovery Call', date: 'Jul 15 · 9:30 AM', color: 'var(--primary)' },
                            { name: 'Maria Garcia', label: 'Strategy Session', date: 'Jul 16 · 2:00 PM', color: '#8b5cf6' },
                            { name: 'Tom Lee',      label: 'Quick Sync', date: 'Jul 17 · 11:00 AM', color: '#f59e0b' },
                          ].map((r) => (
                            <div key={r.name} className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-foreground truncate">{r.name}</p>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: r.color }} />
                                  <p className="text-[9px] text-muted-foreground truncate">{r.label}</p>
                                </div>
                              </div>
                              <p className="shrink-0 text-[9px] text-muted-foreground">{r.date}</p>
                            </div>
                          ))}
                        </div>

                        {/* Recent bookings */}
                        <div className="border border-border bg-card">
                          <div className="flex items-center justify-between border-b border-border px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-foreground">Recent Bookings</span>
                              <span className="flex h-4 min-w-4 items-center justify-center bg-muted px-1 text-[8px] font-bold text-muted-foreground">5</span>
                            </div>
                            <span className="text-[9px] font-semibold text-primary">View all</span>
                          </div>
                          {[
                            { name: 'Sarah Chen',  label: 'Discovery Call',    status: 'confirmed', color: 'var(--primary)' },
                            { name: 'James Park',  label: 'Strategy Session',  status: 'confirmed', color: '#8b5cf6'        },
                            { name: 'Nina Patel',  label: 'Quick Sync',        status: 'cancelled', color: '#f59e0b'        },
                          ].map((b) => (
                            <div key={b.name} className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-foreground truncate">{b.name}</p>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: b.color }} />
                                  <p className="text-[9px] text-muted-foreground truncate">{b.label}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 ${b.status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                {b.status === 'confirmed' ? '● Confirmed' : '● Cancelled'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── HOW IT WORKS ────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-32 lg:py-44">

          {/* Floating gradient blobs */}
          <div
            className="pointer-events-none absolute left-[4%] top-[8%] h-[560px] w-[560px]"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 65%)', filter: 'blur(52px)' }}
          />
          <div
            className="pointer-events-none absolute right-[4%] bottom-[8%] h-[440px] w-[440px]"
            style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 65%)', filter: 'blur(52px)' }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.04) 0%, transparent 65%)', filter: 'blur(40px)' }}
          />

          {/* Subtle dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(20,184,166,0.22) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
            <Reveal className="mb-24 text-center" direction="up">
              <p className="mb-4 text-xs font-black uppercase tracking-eyebrow text-primary">How It Works</p>
              <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl">
                From sign-up to booked
                <br className="hidden sm:block" />
                in under 5 minutes.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground">
                Three steps is all it takes — no configuration nightmares, no IT tickets, no training required.
              </p>
            </Reveal>

            {/* ── Desktop: 3 cards side-by-side with arrow connectors ── */}
            <div className="hidden md:grid md:grid-cols-[1fr_52px_1fr_52px_1fr] items-stretch">
              {STEPS.flatMap((step, i) => {
                const Icon = step.icon
                const stepDirs = ['left', 'up', 'right'] as const
                const card = (
                  <Reveal
                    key={step.num}
                    delay={i * 140}
                    direction={stepDirs[i]}
                    className="group relative flex flex-col border border-border bg-card px-8 py-10 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-primary/[0.025]"
                  >
                    {/* Top accent bar */}
                    <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-primary to-teal-400 transition-transform duration-300 group-hover:scale-x-100" />

                    {/* Step badge */}
                    <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center bg-primary text-[10px] font-black text-primary-foreground">
                      {step.num}
                    </span>

                    {/* Icon container */}
                    <div className="mb-8 flex h-[72px] w-[72px] items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-all duration-300 group-hover:border-primary/35 group-hover:from-primary/20 group-hover:to-primary/10">
                      <Icon size={32} weight="duotone" />
                    </div>

                    <h3 className="mb-3 font-bold text-xl">{step.title}</h3>
                    <p className="mb-auto text-sm leading-relaxed text-muted-foreground">{step.description}</p>

                    {/* Live example badge */}
                    <div className="mt-8 inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/10">
                      <CheckCircle size={11} weight="fill" />
                      {step.detail}
                    </div>
                  </Reveal>
                )

                if (i === STEPS.length - 1) return [card]

                const connector = (
                  <div key={`connector-${i}`} className="flex flex-col items-center justify-center gap-1.5">
                    <div className="h-px w-5 bg-border" />
                    <ArrowRight size={14} weight="bold" className="text-primary/50" />
                  </div>
                )

                return [card, connector]
              })}
            </div>

            {/* ── Mobile: stacked with vertical arrows ── */}
            <div className="flex flex-col md:hidden">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const mobileDirs = ['left', 'fade', 'right'] as const
                return (
                  <div key={step.num}>
                    <Reveal
                      delay={i * 130}
                      direction={mobileDirs[i]}
                      className="group relative flex flex-col border border-border bg-card px-7 py-9 transition-all duration-300"
                    >
                      {/* Top accent bar */}
                      <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-primary to-teal-400 transition-transform duration-300 group-hover:scale-x-100" />

                      {/* Step badge */}
                      <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center bg-primary text-[10px] font-black text-primary-foreground">
                        {step.num}
                      </span>

                      {/* Icon */}
                      <div className="mb-5 flex h-14 w-14 items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                        <Icon size={26} weight="duotone" />
                      </div>

                      <h3 className="mb-2 font-bold text-lg">{step.title}</h3>
                      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

                      <div className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                        <CheckCircle size={11} weight="fill" />
                        {step.detail}
                      </div>
                    </Reveal>

                    {i < STEPS.length - 1 && (
                      <div className="flex h-12 items-center justify-center">
                        <ArrowDown size={18} className="text-primary/40" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── FULL FEATURE LIST ────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-muted/20 py-24">
          <div className="mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              {/* Left: title + CTA */}
              <Reveal direction="left">
                <p className="mb-3 text-xs font-black uppercase tracking-eyebrow text-primary">Everything included</p>
                <h2 className="mb-4 font-black text-3xl sm:text-4xl">
                  Every feature.<br />Zero paywalls.
                </h2>
                <p className="mb-6 text-muted-foreground leading-relaxed">
                  We don&apos;t have a paid plan. There&apos;s nothing to unlock.
                  Everything listed here is yours from the moment you sign up.
                </p>
                <Link href="/login" className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Start free today <ArrowRight size={14} weight="bold" />
                </Link>
              </Reveal>

              {/* Right: grouped feature columns */}
              <div className="grid gap-6 sm:grid-cols-3">
                {FEATURE_GROUPS.map((group, i) => {
                  const Icon = group.icon
                  return (
                    <Reveal key={group.label} delay={100 + i * 130} direction="right">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
                          <Icon size={14} weight="duotone" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-eyebrow text-foreground">{group.label}</span>
                      </div>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle size={13} weight="fill" className="shrink-0 text-primary" />
                            <span className="text-sm text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────────────────────────── */}
        <section id="faq" className="relative overflow-hidden border-t border-border bg-background py-24 lg:py-32">
          <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
            <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-20">

              {/* ── Left: product UI preview — dark card on white bg ── */}
              <Reveal className="lg:sticky lg:top-28" direction="left">
                <div className="relative">
                  {/* Soft teal glow — reduced opacity for light background */}
                  <div className="pointer-events-none absolute -inset-6 bg-primary/[0.06] blur-3xl" />
                  {/* Explicit dark bg so it reads as real product UI */}
                  <div
                    className="relative border p-6"
                    style={{ background: 'linear-gradient(145deg, #0d2018, #091512)', borderColor: 'rgba(255,255,255,0.09)' }}
                  >

                    {/* Host row */}
                    <div className="mb-5 flex items-center gap-3 border-b border-white/[0.08] pb-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-sm font-bold text-white">
                        J
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Jane Smith</p>
                        <p className="text-xs text-white/40">30-Minute Meeting</p>
                      </div>
                    </div>

                    {/* Mini calendar */}
                    <div className="mb-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">July 2026</p>
                        <div className="flex gap-1">
                          <div className="h-5 w-5 border border-white/10 bg-white/5" />
                          <div className="h-5 w-5 border border-white/10 bg-white/5" />
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['M','T','W','T','F','S','S'].map((d, i) => (
                          <span key={i} className="py-1 text-[10px] font-semibold text-white/25">{d}</span>
                        ))}
                        {[null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((d, i) => (
                          <div
                            key={i}
                            className={[
                              'flex h-7 w-full items-center justify-center text-[11px] font-medium transition-colors',
                              d === null ? '' :
                              d === 10 ? 'bg-primary text-white font-bold' :
                              [7,8,14,15,21,22,28,29].includes(d as number) ? 'text-white/20' :
                              d && d < 7 ? 'text-white/20' :
                              'cursor-pointer text-white/70 hover:bg-white/10',
                            ].join(' ')}
                          >
                            {d ?? ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Available Times</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { t: '9:00 AM',  active: false },
                          { t: '10:30 AM', active: true  },
                          { t: '1:00 PM',  active: false },
                          { t: '3:30 PM',  active: false },
                        ].map(({ t, active }) => (
                          <div
                            key={t}
                            className={[
                              'py-2.5 text-center text-xs font-semibold border transition-colors',
                              active
                                ? 'border-primary bg-primary text-white'
                                : 'border-white/[0.12] bg-white/[0.05] text-white/60',
                            ].join(' ')}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Powered by badge */}
                    <div className="mt-5 border-t border-white/[0.06] pt-4 text-center">
                      <span className="text-[10px] text-white/25">Scheduling powered by <span className="text-primary/60 font-semibold">Schduled</span></span>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* ── Right: FAQ accordion on white background ── */}
              <Reveal delay={100} direction="right">
                <p className="mb-3 text-[11px] font-black uppercase tracking-eyebrow text-primary">FAQ</p>
                <h2 className="mb-8 font-black text-3xl leading-tight text-foreground sm:text-4xl">
                  Frequently Asked<br className="hidden sm:block" /> Questions
                </h2>
                <FaqAccordion items={FAQ_ITEMS} variant="light" />
                <p className="mt-6 text-sm text-muted-foreground">
                  Still have questions?{' '}
                  <a href={`mailto:${env.NEXT_PUBLIC_CONTACT_EMAIL}`} className="text-primary transition-colors hover:underline">
                    Contact us
                  </a>
                </p>
              </Reveal>

            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-clip py-36" style={DARK_BG}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.038]"
            style={{ backgroundImage: 'linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
          {/* Large glow behind title */}
          <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[700px] animate-schduled-glow-pulse"
            style={{ background: 'radial-gradient(ellipse,rgba(20,184,166,.30) 0%,transparent 65%)', filter: 'blur(16px)', opacity: 0.9 }} />

          <div className="relative mx-auto max-w-[1400px] px-5 text-center md:px-12 xl:px-20">
            <div className="mx-auto max-w-2xl">
            <Reveal direction="scale">
              <p className="mb-5 text-xs font-black uppercase tracking-eyebrow text-teal-400/55">Get started today</p>
              <h2 className="font-black text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                Your booking link
                <br />
                <span style={{
                  background: 'linear-gradient(90deg,#2dd4bf 0%,#14b8a6 35%,#5eead4 70%,#14b8a6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  is one click away.
                </span>
              </h2>
              <p className="mt-6 text-lg text-white/50">
                Sign up in 30 seconds. Connect your calendar.
                Share your link. The rest is automatic.
              </p>
            </Reveal>
            <Reveal delay={150} direction="up" className="mt-10 flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/login" className="relative inline-flex items-center gap-2 overflow-hidden bg-primary px-9 py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  <span className="animate-schduled-sheen pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%)', backgroundSize: '200% auto' }} />
                  Start Free
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center gap-2 border border-white/20 px-9 py-4 text-base font-semibold text-white/75 transition-all hover:border-white/40 hover:text-white">
                  View Demo
                </a>
              </div>

              {/* Checkmarks */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {['Free forever', 'No credit card', 'Setup in 30 seconds'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-sm text-white/35">
                    <CheckCircle size={13} weight="fill" className="text-teal-400/60 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>

              {/* Animated down arrow */}
              <div className="mt-4 animate-bounce text-white/20">
                <ArrowDown size={22} />
              </div>
            </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  )
}
