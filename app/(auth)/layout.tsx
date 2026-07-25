import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarCheck,
  Clock,
  Globe,
  GoogleLogo,
  LinkSimple,
  VideoCamera,
} from '@phosphor-icons/react/dist/ssr'
import { LocalTimezone } from './_components/local-timezone'

const SLOTS = ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00']

const FEATURES = [
  { icon: CalendarCheck, title: 'Connect calendars', desc: 'Reads availability across your calendars.' },
  { icon: Clock, title: 'Set availability', desc: 'Pick the hours you want to be booked.' },
  { icon: LinkSimple, title: 'Share one link', desc: 'Send it or embed it anywhere.' },
]

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page p-4 sm:p-6 lg:p-8">
      {/* Page-level ambient glow so the card floats on a cohesive surface */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 bg-primary/[0.10] blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 bg-cyan-400/[0.07] blur-[120px]" />
      </div>

      {/* ── One unified card holding both halves ── */}
      <div className="relative z-10 grid w-full max-w-7xl overflow-hidden border border-border bg-background ring-1 ring-foreground/10 lg:grid-cols-2">
        {/* ── Brand hero (desktop only) ── */}
        <div
          className="relative hidden flex-col justify-between gap-8 overflow-hidden p-8 text-white lg:flex xl:p-10"
          style={{ background: 'linear-gradient(150deg, #0a6b62 0%, #0d9488 52%, #0a8fa0 100%)' }}
        >
        {/* dot pattern + glows */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 bg-cyan-300/25 blur-[90px]" />
          <div className="absolute -bottom-28 -left-20 h-96 w-96 bg-teal-200/15 blur-[100px]" />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-flex animate-schduled-reveal">
          <Image src="/email-logo-white.png" alt="Schduled" width={150} height={32} priority />
        </Link>

        {/* Headline + booking-widget mockup */}
        <div className="relative z-10 space-y-7">
          <div className="max-w-md space-y-3 animate-schduled-fade-up">
            <h1 className="font-black text-[36px] leading-[1.1] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Schedule meetings.
              <br />
              Not emails.
            </h1>
            <p className="max-w-sm text-[15px] text-white/80">
              Share one booking link — Schduled handles scheduling, reminders, and
              reschedules for you.
            </p>
          </div>

          {/* ── Booking widget mockup (bordered, no shadow/radius; gentle float) ── */}
          <div className="relative max-w-md animate-schduled-float">
            <div className="border border-white/15 bg-white/[0.08] p-4">
              {/* window chrome */}
              <div className="mb-3 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-white/30" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="ml-2 text-xs text-white/60">Book a meeting</span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {/* event details */}
                <div className="col-span-2 space-y-3 border-r border-white/10 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                      D
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">Dhruti Hirapara</p>
                      <p className="truncate text-[11px] text-white/60">Design review</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-white/75">
                    <li className="flex items-center gap-1.5"><Clock size={12} weight="fill" /> 30 min</li>
                    <li className="flex items-center gap-1.5"><VideoCamera size={12} weight="fill" /> Google Meet</li>
                    <li className="flex items-center gap-1.5"><Globe size={12} weight="fill" /> <LocalTimezone /></li>
                  </ul>
                </div>

                {/* time slots */}
                <div className="col-span-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-white/70">
                    <span className="font-semibold text-white/90">Tue, Jun 30</span>
                    <span>‹ ›</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SLOTS.map((t, i) => (
                      <span
                        key={t}
                        className={`border py-1 text-center text-[11px] ${
                          i === 1 ? 'border-white/50 bg-white/20 font-semibold' : 'border-white/15 bg-white/[0.06] text-white/80'
                        }`}
                      >
                        {t} AM
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* floating status chips */}
            <div className="absolute -right-3 -top-3 inline-flex items-center gap-1.5 border border-white/20 bg-[#0a6b62] px-2.5 py-1.5 text-xs font-medium ring-1 ring-white/10">
              <CalendarCheck size={13} weight="fill" /> Confirmed
            </div>
            <div className="absolute -bottom-3 left-6 inline-flex items-center gap-1.5 border border-white/20 bg-[#0a8fa0] px-2.5 py-1.5 text-xs font-medium ring-1 ring-white/10">
              <VideoCamera size={13} weight="fill" /> Zoom link added
            </div>
          </div>
        </div>

        {/* Feature points + footer */}
        <div className="relative z-10 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-1.5">
                <Icon size={20} weight="fill" className="text-white/90" />
                <p className="text-xs font-semibold">{title}</p>
                <p className="text-[11px] leading-snug text-white/60">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/15 pt-4 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5"><GoogleLogo size={13} weight="bold" /> Google Calendar</span>
            <span className="inline-flex items-center gap-1.5"><VideoCamera size={13} weight="fill" /> Zoom</span>
            <span className="ml-auto flex items-center gap-4">
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
            </span>
          </div>
          </div>
        </div>

        {/* ── Form column ── */}
        <div className="relative flex items-center justify-center overflow-hidden bg-background px-6 py-12 sm:px-12">
          {/* Teal → cyan wash so the form half is a designed surface, not flat white */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-cyan-400/[0.05]" />
          {/* Faint dot grid for texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          {/* Stronger teal tint at the seam so the form half flows from the brand panel */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-44 bg-gradient-to-r from-primary/[0.08] to-transparent lg:block" />
          {/* Soft corner glow */}
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 bg-cyan-400/[0.06] blur-[90px]" />
          <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
