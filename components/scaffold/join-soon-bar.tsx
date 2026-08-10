"use client";

import { Clock, VideoCamera, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface NextMeeting {
  endUtc: string;
  eventName: string;
  id: string;
  inviteeName: string;
  joinUrl: string | null;
  locationType: string;
  startUtc: string;
}

const POLL_MS = 60_000;
const DISMISS_KEY = "join-soon-dismissed";

// Lead time (minutes before start) is user-configurable in Settings; 15 is the fallback
// until the API responds. Silently no-ops if autoplay is blocked (no prior user gesture).
function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) {
      return;
    }
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
}

export function JoinSoonBar() {
  const [meeting, setMeeting] = useState<NextMeeting | null>(null);
  const [leadMs, setLeadMs] = useState(15 * 60_000);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const chimedFor = useRef<string | null>(null);

  // Seed the dismissed id from this session so it doesn't reappear after close.
  useEffect(() => {
    try {
      setDismissedId(sessionStorage.getItem(DISMISS_KEY));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/next");
      if (!res.ok) {
        setMeeting(null);
        return;
      }
      const data = await res.json();
      if (typeof data.leadMinutes === "number") {
        setLeadMs(data.leadMinutes * 60_000);
      }
      setMeeting(data.meeting ?? null);
    } catch {
      /* network blip — keep last known */
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  // Chime once per meeting; kept in an effect (not render) to avoid double-firing under StrictMode.
  useEffect(() => {
    if (!meeting) {
      return;
    }
    const start = new Date(meeting.startUtc).getTime();
    const end = new Date(meeting.endUtc).getTime();
    const visible =
      now >= start - leadMs && now < end && dismissedId !== meeting.id;
    if (visible && chimedFor.current !== meeting.id) {
      chimedFor.current = meeting.id;
      playChime();
    }
  }, [meeting, now, leadMs, dismissedId]);

  if (!meeting) {
    return null;
  }

  const start = new Date(meeting.startUtc).getTime();
  const end = new Date(meeting.endUtc).getTime();
  const msToStart = start - now;

  // Visible from the configured lead time before start until the meeting ends.
  const inWindow = now >= start - leadMs && now < end;
  const isDismissed = dismissedId === meeting.id;
  if (!inWindow || isDismissed) {
    return null;
  }

  const inProgress = now >= start;

  let countdown: string;
  if (inProgress) {
    countdown = "In progress";
  } else {
    const totalSec = Math.max(0, Math.round(msToStart / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    countdown = m > 0 ? `Starts in ${m} min` : `Starts in ${s}s`;
  }

  function dismiss() {
    if (!meeting) {
      return;
    }
    try {
      sessionStorage.setItem(DISMISS_KEY, meeting.id);
    } catch {}
    setDismissedId(meeting.id);
  }

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-primary/30 bg-primary/[0.06] px-4 py-2.5 md:px-6 animate-in slide-in-from-top-2 duration-300"
      role="status"
    >
      <span className="flex size-8 shrink-0 items-center justify-center bg-primary/15 text-primary">
        <Clock size={16} weight="duotone" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-base-content">
          {meeting.eventName}
          <span className="ml-2 font-normal text-muted-foreground">
            with {meeting.inviteeName}
          </span>
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            inProgress ? "text-primary" : "text-muted-foreground"
          )}
        >
          {countdown}
        </p>
      </div>

      {meeting.joinUrl && (
        <a
          className="inline-flex shrink-0 items-center gap-1.5 bg-primary px-3 py-1.5 text-sm font-semibold text-primary-content transition-colors hover:bg-primary/90"
          href={meeting.joinUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <VideoCamera size={14} weight="fill" />
          Join now
        </a>
      )}

      <button
        aria-label="Dismiss"
        className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
        onClick={dismiss}
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
