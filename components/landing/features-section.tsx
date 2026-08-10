"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarBlank,
  CalendarCheck,
  CheckCircle,
  Clock,
  Copy,
  Lightning,
  LinkSimple,
  Plus,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "calendar",
    icon: CalendarBlank,
    title: "Connect your calendar",
    description:
      "Link Google Calendar once. Schduled reads your busy blocks in real time and hides them instantly — zero double-bookings, guaranteed.",
  },
  {
    id: "availability",
    icon: Clock,
    title: "Set your availability",
    description:
      "Choose which days and hours you're open. Your booking page only ever shows slots you can actually take.",
  },
  {
    id: "meeting-types",
    icon: Lightning,
    title: "Create meeting types",
    description:
      "Build reusable templates — a 30-min call, a 60-min strategy session, a quick 15-min sync. Each gets its own link.",
  },
  {
    id: "booking-link",
    icon: LinkSimple,
    title: "Share your booking link",
    description:
      "Put schduled.com/yourname in your email signature, website, or LinkedIn. Invitees pick a slot and you're done.",
  },
  {
    id: "reminders",
    icon: Bell,
    title: "Get booked automatically",
    description:
      "Instant confirmation emails. 24h and 1h reminders sent automatically. Reschedule links always included — no no-shows.",
  },
];

// ── Mockup components ─────────────────────────────────────────────────────────

function CalendarMockup() {
  return (
    <div className="w-full">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/10">
          <svg
            aria-hidden
            className="text-primary"
            fill="currentColor"
            height="22"
            viewBox="0 0 24 24"
          >
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-base-content">Google Calendar</p>
          <p className="text-xs text-muted-foreground">jane@example.com</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
          <CheckCircle size={12} weight="fill" />
          Connected
        </div>
      </div>
      <div className="mb-3 border border-base-300">
        <div className="border-b border-base-300 bg-base-200/40 px-4 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Today&apos;s events (hidden from bookers)
          </p>
        </div>
        {[
          { time: "9:00 – 10:00 AM", label: "Team standup", busy: true },
          { time: "1:00 – 2:00 PM", label: "Product review", busy: true },
          { time: "3:00 – 3:30 PM", label: "Focus block", busy: true },
        ].map((ev) => (
          <div
            className="flex items-center gap-3 border-b border-base-300/50 px-4 py-3 last:border-0"
            key={ev.label}
          >
            <div className="h-2 w-2 shrink-0 bg-muted-foreground/30" />
            <div className="min-w-0 flex-1">
              <p className="text-sm line-through text-muted-foreground/50">
                {ev.label}
              </p>
              <p className="text-xs text-muted-foreground/40">{ev.time}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 border border-dashed border-muted-foreground/20 px-1.5 py-0.5">
              hidden
            </span>
          </div>
        ))}
      </div>
      <div className="border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <p className="text-xs font-semibold text-primary">
          Busy blocks sync in real time — no manual updates needed.
        </p>
      </div>
    </div>
  );
}

function AvailabilityMockup() {
  const days = [
    { short: "S", label: "Sun", avail: false },
    { short: "M", label: "Mon", avail: true, from: "9:00 am", to: "4:30 pm" },
    { short: "T", label: "Tue", avail: false },
    { short: "W", label: "Wed", avail: true, from: "9:30 am", to: "5:00 pm" },
    { short: "T", label: "Thu", avail: true, from: "10:00 am", to: "6:00 pm" },
    { short: "F", label: "Fri", avail: true, from: "10:00 am", to: "3:00 pm" },
    { short: "S", label: "Sat", avail: false },
  ];
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center gap-2">
        <Clock className="text-primary" size={15} />
        <p className="text-sm font-bold text-base-content">Weekly hours</p>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Set when you are typically available for meetings
      </p>
      <div className="space-y-1">
        {days.map((d, i) => (
          <div
            className={cn(
              "flex items-center gap-3 px-1 py-2.5",
              d.avail ? "" : "opacity-50"
            )}
            key={i}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center text-xs font-black",
                d.avail
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-muted-foreground"
              )}
            >
              {d.short}
            </div>
            {d.avail ? (
              <div className="flex flex-1 items-center gap-2">
                <div className="flex h-8 items-center border border-base-300 bg-base-100 px-3 text-xs font-medium text-base-content min-w-[78px]">
                  {d.from}
                </div>
                <span className="text-xs text-muted-foreground">–</span>
                <div className="flex h-8 items-center border border-base-300 bg-base-100 px-3 text-xs font-medium text-base-content min-w-[72px]">
                  {d.to}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button className="flex h-7 w-7 items-center justify-center text-muted-foreground/50 hover:text-base-content transition-colors">
                    <X size={12} />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center text-muted-foreground/50 hover:text-base-content transition-colors">
                    <Plus size={12} />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center text-muted-foreground/50 hover:text-base-content transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Unavailable
                </span>
                <button className="flex h-7 w-7 items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-base-300 pt-4">
        <span className="text-xs text-muted-foreground">Timezone:</span>
        <span className="text-xs font-semibold text-base-content">
          Asia/Kolkata
        </span>
        <span className="text-xs text-muted-foreground">▾</span>
      </div>
    </div>
  );
}

function MeetingTypesMockup() {
  const types = [
    { label: "30-min Discovery Call", dur: "30 min", active: true },
    { label: "60-min Strategy Session", dur: "60 min", active: false },
    { label: "15-min Quick Sync", dur: "15 min", active: false },
  ];
  return (
    <div className="w-full space-y-2.5">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Your meeting types
      </p>
      {types.map((t) => (
        <div
          className={cn(
            "flex items-center justify-between border px-4 py-4 transition-all",
            t.active
              ? "border-primary/40 bg-primary/5"
              : "border-base-300 hover:border-primary/20"
          )}
          key={t.label}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0",
                t.active ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  t.active ? "text-base-content" : "text-base-content/80"
                )}
              >
                {t.label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> {t.dur} · Video call
              </p>
            </div>
          </div>
          {t.active && (
            <div className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Lightning size={12} weight="fill" /> Active
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center justify-center border border-dashed border-base-300 py-3">
        <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
          <Plus size={13} /> Add meeting type
        </button>
      </div>
    </div>
  );
}

function BookingLinkMockup() {
  return (
    <div className="w-full">
      <div className="mb-5 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3">
        <LinkSimple className="shrink-0 text-primary" size={14} />
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis font-mono text-sm text-base-content/60">
          schduled.com/<span className="font-bold text-primary">yourname</span>
        </span>
        <button className="shrink-0 text-xs font-semibold text-primary hover:underline">
          Copy
        </button>
      </div>
      <div className="overflow-hidden border border-base-300">
        <div className="flex items-center gap-3 border-b border-base-300 px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10 font-black text-lg text-primary">
            JS
          </div>
          <div>
            <p className="font-bold text-base-content">Jane Smith</p>
            <p className="text-xs text-muted-foreground">
              Product Lead · San Francisco
            </p>
          </div>
        </div>
        <div className="space-y-2 p-4">
          {[
            { label: "30-min Discovery Call", dur: "30 min" },
            { label: "60-min Strategy Session", dur: "60 min" },
          ].map((et, i) => (
            <div
              className={cn(
                "flex items-center justify-between border px-4 py-3",
                i === 0 ? "border-primary/30 bg-primary/5" : "border-base-300"
              )}
              key={et.label}
            >
              <span className="text-sm font-medium text-base-content">
                {et.label}
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> {et.dur}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-base-300 bg-base-200/30 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Powered by Schduled · Free forever
          </p>
        </div>
      </div>
    </div>
  );
}

function RemindersMockup() {
  const notes = [
    {
      icon: CalendarCheck,
      label: "Booking confirmed",
      sub: "Discovery Call · Today at 3:00 PM · Google Meet link included",
      t: "just now",
      accent: true,
    },
    {
      icon: Bell,
      label: "Reminder: 24h away",
      sub: "Meeting tomorrow at 3:00 PM — click to reschedule",
      t: "1 day",
      accent: false,
    },
    {
      icon: Bell,
      label: "Reminder: 1h away",
      sub: "Your meeting starts at 3:00 PM — click to join",
      t: "1 hour",
      accent: false,
    },
  ];
  return (
    <div className="w-full space-y-2.5">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Automatic emails sent to invitee
      </p>
      {notes.map((n) => {
        const Icon = n.icon;
        return (
          <div
            className={cn(
              "flex items-start gap-3 border p-4",
              n.accent ? "border-primary/40 bg-primary/5" : "border-base-300"
            )}
            key={n.label}
          >
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center",
                n.accent
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-muted-foreground"
              )}
            >
              <Icon size={15} weight={n.accent ? "fill" : "regular"} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-base-content">
                  {n.label}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground/50">
                  {n.t}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {n.sub}
              </p>
            </div>
          </div>
        );
      })}
      <div className="border border-dashed border-base-300 px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground/50">
          Every email includes a one-click reschedule link
        </p>
      </div>
    </div>
  );
}

const MOCKUPS = [
  <CalendarMockup key="calendar" />,
  <AvailabilityMockup key="availability" />,
  <MeetingTypesMockup key="meeting-types" />,
  <BookingLinkMockup key="booking-link" />,
  <RemindersMockup key="reminders" />,
];

// ── Main component ────────────────────────────────────────────────────────────

const AUTO_ADVANCE_MS = 4000;

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  function switchTo(idx: number) {
    if (idx === active) {
      return;
    }
    setDirection(idx > active ? 1 : -1);
    setActive(idx);
  }

  function step(delta: number) {
    switchTo((active + delta + STEPS.length) % STEPS.length);
  }

  // Auto-advance, paused while a step is hovered/interacted with. `active` is
  // listed on purpose (not read directly) — it restarts the timer on every
  // step change, whether from a click or the previous auto-advance tick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: active intentionally restarts the timer, see above
  useEffect(() => {
    if (paused) {
      return;
    }
    const id = setTimeout(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % STEPS.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [active, paused]);

  return (
    <section
      className="relative overflow-clip border-t border-base-300 bg-base-200/20 py-24"
      id="features"
    >
      {/* Subtle grid texture + teal glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,184,166,1) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,1) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px]"
        style={{
          background:
            "radial-gradient(circle, rgba(20,184,166,.12) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-5 md:px-12 xl:px-20">
        {/* Header */}
        <Reveal className="mb-16 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-eyebrow text-primary">
            How it works
          </p>
          <h2 className="font-black text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Scheduling on autopilot
            <br className="hidden sm:block" />
            <span className="text-muted-foreground"> in five simple steps</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Set it up once. Schduled handles bookings, reminders, and scheduling
            automatically.
          </p>
        </Reveal>

        {/* Step list + Mockup panel — 40/60 split on desktop */}
        <div className="grid items-start gap-10 lg:grid-cols-[2fr_3fr] lg:gap-14">
          {/* Left: steps */}
          <Reveal
            className="space-y-0"
            onMouseLeave={() => {
              setHovered(null);
              setPaused(false);
            }}
          >
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = active === i;
              const isExpanded = isActive || hovered === i;
              return (
                <button
                  className={cn(
                    "w-full border-b border-l-2 border-base-300 text-left transition-colors duration-[250ms] last:border-b-0",
                    isActive
                      ? "border-l-primary bg-primary/[0.03]"
                      : isExpanded
                        ? "border-l-primary/40 bg-base-200/30"
                        : "border-l-transparent"
                  )}
                  key={step.id}
                  onClick={() => switchTo(i)}
                  onMouseEnter={() => {
                    setHovered(i);
                    setPaused(true);
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-4 px-4 py-5">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center transition-colors duration-[250ms]",
                        isActive
                          ? "bg-primary text-primary-content"
                          : "bg-base-200 text-muted-foreground"
                      )}
                    >
                      <Icon
                        size={18}
                        weight={isExpanded ? "fill" : "regular"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-bold transition-colors duration-[250ms]",
                          isActive
                            ? "text-base-content"
                            : "text-base-content/50"
                        )}
                      >
                        {step.title}
                      </p>
                      {/* Description expands when active or hovered */}
                      <div
                        className={cn(
                          "grid transition-all duration-[250ms]",
                          isExpanded
                            ? "mt-2 grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <p
                            className={cn(
                              "text-sm leading-relaxed",
                              isActive
                                ? "text-base-content/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Step number */}
                    <span
                      className={cn(
                        "shrink-0 text-xs font-black tabular-nums transition-colors duration-[250ms]",
                        isActive ? "text-primary" : "text-muted-foreground/30"
                      )}
                    >
                      0{i + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </Reveal>

          {/* Right: sticky mockup panel */}
          <Reveal className="lg:sticky lg:top-28" delay={150}>
            <div className="border border-base-300 bg-base-100 p-7 shadow-none ring-1 ring-foreground/10">
              {/* Progress bar — one segment per step */}
              <div className="mb-5 flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div
                    className="h-1 flex-1 overflow-hidden bg-muted-foreground/15"
                    key={s.id}
                  >
                    {i === active && (
                      <motion.div
                        animate={{ width: paused ? "0%" : "100%" }}
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        key={paused ? `${active}-paused` : active}
                        transition={{
                          duration: paused ? 0 : AUTO_ADVANCE_MS / 1000,
                          ease: "linear",
                        }}
                      />
                    )}
                    {i < active && <div className="h-full w-full bg-primary" />}
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div className="mb-6 flex items-center gap-2 border-b border-base-300 pb-4">
                <div className="flex h-8 w-8 items-center justify-center bg-primary/10 text-primary">
                  {(() => {
                    const Icon = STEPS[active].icon;
                    return <Icon size={15} weight="fill" />;
                  })()}
                </div>
                <p className="text-sm font-bold text-base-content">
                  {STEPS[active].title}
                </p>
              </div>

              {/* Mockup — slide + fade + scale transition */}
              <div className="relative min-h-[260px] overflow-hidden">
                <AnimatePresence custom={direction} initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    custom={direction}
                    exit={
                      reduceMotion
                        ? undefined
                        : { opacity: 0, x: -direction * 24, scale: 0.98 }
                    }
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, x: direction * 24, scale: 0.98 }
                    }
                    key={active}
                    transition={{
                      duration: reduceMotion ? 0 : 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {MOCKUPS[active]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile step navigation */}
            <div className="mt-6 flex items-center justify-between gap-4 lg:hidden">
              <button
                aria-label="Previous step"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-base-300 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                onClick={() => step(-1)}
                type="button"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                Step {active + 1} of {STEPS.length}
              </span>
              <button
                aria-label="Next step"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-base-300 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                onClick={() => step(1)}
                type="button"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
