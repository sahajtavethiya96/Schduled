"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Clock,
  HandWaving,
  LinkSimple,
  RocketLaunch,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

type Placement = "right" | "bottom" | "left" | "top";

type Step = {
  kind: "modal" | "spotlight";
  target?: string;
  placement?: Placement;
  icon: IconComponent;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    kind: "modal",
    icon: HandWaving,
    title: "Welcome to Schduled",
    description:
      "You're all set up. Take a 30-second tour and we'll show you the few things you need to start getting bookings.",
  },
  {
    kind: "spotlight",
    target: '[data-tour="meeting-types"]',
    placement: "right",
    icon: CalendarPlus,
    title: "Create Meeting Types",
    description:
      "Create reusable meeting templates people can book — a 30-min call, a demo, a consultation.",
  },
  {
    kind: "spotlight",
    target: '[data-tour="availability"]',
    placement: "right",
    icon: Clock,
    title: "Set Your Availability",
    description:
      "Define when you're available so people only ever see time slots you can actually take.",
  },
  {
    kind: "spotlight",
    target: '[data-tour="booking-link"]',
    placement: "bottom",
    icon: LinkSimple,
    title: "Share Your Booking Link",
    description:
      "Share this link on your website, email signature, or social profiles — invitees pick a slot.",
  },
  {
    kind: "spotlight",
    target: '[data-tour="bookings"]',
    placement: "right",
    icon: CalendarCheck,
    title: "Track Your Bookings",
    description:
      "View, manage, reschedule, or cancel every meeting from one place.",
  },
  {
    kind: "modal",
    icon: RocketLaunch,
    title: "You're Ready to Go",
    description:
      "Your scheduling workspace is ready. Start sharing your booking page and receiving meetings.",
  },
];

const PAD = 6;
const GAP = 14;
const TOOLTIP_W = 320;

function useSpotlight(step: Step, active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active || step.kind !== "spotlight" || !step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) {
      setRect(null);
      return;
    }

    let raf = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      // Hidden target (e.g. sidebar on mobile) falls back to a centered card
      setRect(r.width === 0 || r.height === 0 ? null : r);
    };

    el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const settle = setTimeout(measure, 320);
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step, active]);

  return rect;
}

function tooltipPosition(rect: DOMRect, placement: Placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estH = 230;

  let left: number;
  let top: number;
  switch (placement) {
    case "right":
      left = rect.right + GAP;
      top = rect.top + rect.height / 2 - estH / 2;
      break;
    case "left":
      left = rect.left - TOOLTIP_W - GAP;
      top = rect.top + rect.height / 2 - estH / 2;
      break;
    case "bottom":
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      top = rect.bottom + GAP;
      break;
    default:
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      top = rect.top - estH - GAP;
  }
  left = Math.min(Math.max(12, left), vw - TOOLTIP_W - 12);
  top = Math.min(Math.max(12, top), vh - 12 - 140);
  return { left, top };
}

export function GuidedTour({ userId }: { userId: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const storageKey = `schduled:tour:${userId}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setShow(true);
      }
    } catch {
      // localStorage unavailable (private browsing) — skip the tour silently
    }
  }, [storageKey]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setShow(false);
  }, [storageKey]);

  const total = STEPS.length;
  const cur = STEPS[step];
  const rect = useSpotlight(cur, show);

  useEffect(() => {
    if (!show) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        finish();
      } else if (e.key === "ArrowRight") {
        setStep((s) => Math.min(total - 1, s + 1));
      } else if (e.key === "ArrowLeft") {
        setStep((s) => Math.max(0, s - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, finish]);

  // Mark the spotlit target element as active; dim all other tour targets
  useEffect(() => {
    const curStep = STEPS[step];
    for (const el of document.querySelectorAll("[data-tour-active]")) {
      el.removeAttribute("data-tour-active");
    }
    for (const el of document.querySelectorAll("[data-tour-dim]")) {
      el.removeAttribute("data-tour-dim");
    }
    if (!show || curStep.kind !== "spotlight" || !curStep.target) {
      return;
    }
    const el = document.querySelector<HTMLElement>(curStep.target);
    el?.setAttribute("data-tour-active", "true");
    for (const other of document.querySelectorAll<HTMLElement>(
      "[data-sidebar-nav-item]"
    )) {
      if (other !== el) {
        other.setAttribute("data-tour-dim", "true");
      }
    }
    return () => {
      el?.removeAttribute("data-tour-active");
      for (const e of document.querySelectorAll("[data-tour-dim]")) {
        e.removeAttribute("data-tour-dim");
      }
    };
  }, [show, step]);

  if (!show) {
    return null;
  }

  const Icon = cur.icon;
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const anchored = cur.kind === "spotlight" && rect !== null;

  const card = (
    <div className="relative w-full max-w-sm bg-popover ring-2 ring-foreground/15">
      {!isLast && (
        <button
          aria-label="Close tour"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
          onClick={finish}
          type="button"
        >
          <X size={16} weight="bold" />
        </button>
      )}

      <div className="flex flex-col px-6 pb-6 pt-7">
        <div
          className={cn(
            "mb-4 flex h-11 w-11 items-center justify-center bg-primary/10",
            isFirst || isLast ? "self-center" : ""
          )}
        >
          <Icon className="text-primary" size={24} weight="duotone" />
        </div>

        <p
          className={cn(
            "mb-1.5 text-2xs font-bold uppercase tracking-eyebrow text-primary",
            isFirst || isLast ? "text-center" : ""
          )}
        >
          Step {step + 1} of {total}
        </p>
        <h2
          className={cn(
            "mb-2 text-base font-bold text-base-content",
            isFirst || isLast ? "text-center text-lg" : ""
          )}
        >
          {cur.title}
        </h2>
        <p
          className={cn(
            "text-sm leading-relaxed text-muted-foreground",
            isFirst || isLast ? "text-center" : ""
          )}
        >
          {cur.description}
        </p>

        <div
          className={cn(
            "mt-5 flex items-center gap-1.5",
            isFirst || isLast ? "justify-center" : ""
          )}
        >
          {STEPS.map((s, i) => (
            <button
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                "h-1.5 transition-all duration-200",
                i === step
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-base-300 hover:bg-muted-foreground/40"
              )}
              key={s.title}
              onClick={() => setStep(i)}
              type="button"
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {isLast ? (
            <>
              <button
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-base-content"
                onClick={() => setStep(0)}
                type="button"
              >
                Replay tour
              </button>
              <Button
                className="gap-1.5"
                onClick={() => {
                  finish();
                  router.push("/dashboard");
                }}
                size="sm"
              >
                Go to Dashboard
                <ArrowRight size={14} weight="bold" />
              </Button>
            </>
          ) : (
            <>
              <button
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-base-content"
                onClick={finish}
                type="button"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <Button
                    className="gap-1.5"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    size="sm"
                    variant="outline"
                  >
                    <ArrowLeft size={13} />
                    Back
                  </Button>
                )}
                <Button
                  className="gap-1.5"
                  onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                  size="sm"
                >
                  {isFirst ? "Start tour" : "Next"}
                  <ArrowRight size={14} weight="bold" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (anchored && rect) {
    const pos = tooltipPosition(rect, cur.placement ?? "right");
    const holeX = rect.left - PAD;
    const holeY = rect.top - PAD;
    const holeW = rect.width + PAD * 2;
    const holeH = rect.height + PAD * 2;

    return (
      <div className="fixed inset-0 z-[200]">
        {/* SVG mask dims everything but the target — avoids box-shadow (banned in this project) */}
        <svg
          aria-hidden="true"
          className="pointer-events-auto absolute inset-0 h-full w-full"
        >
          <defs>
            <mask id="tour-spotlight">
              <rect fill="white" height="100%" width="100%" x="0" y="0" />
              <rect
                fill="black"
                height={holeH}
                width={holeW}
                x={holeX}
                y={holeY}
              />
            </mask>
          </defs>
          <rect
            fill="#000"
            fillOpacity={0.55}
            height="100%"
            mask="url(#tour-spotlight)"
            width="100%"
            x="0"
            y="0"
          />
        </svg>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute border-2 border-primary transition-all duration-200"
          style={{ left: holeX, top: holeY, width: holeW, height: holeH }}
        />

        <div
          aria-label={cur.title}
          className="pointer-events-auto absolute transition-all duration-200"
          role="dialog"
          style={{ left: pos.left, top: pos.top, width: TOOLTIP_W }}
        >
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4">
      <div
        aria-label={cur.title}
        className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        {card}
      </div>
    </div>
  );
}
