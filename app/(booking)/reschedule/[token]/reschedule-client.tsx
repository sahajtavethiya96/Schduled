"use client";

import {
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  HourglassMedium,
  Spinner,
} from "@phosphor-icons/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlotInfo {
  endUtc: string;
  startUtc: string;
}

interface Props {
  availableDaysOfWeek: string[];
  currentStartUtc: string;
  duration: number;
  eventName: string;
  hostName: string;
  inviteeTimezone: string;
  maxDate: string;
  slug: string;
  today: string;
  token: string;
  username: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATE_FMT = "EEE, MMM d 'at' h:mm a";

export function RescheduleClient(props: Props) {
  const router = useRouter();
  // Seed from the server-known timezone so SSR and the first client render
  // match (avoids a hydration mismatch when the server tz differs from the
  // visitor's), then correct to the browser's timezone on mount.
  const [inviteeTz, setInviteeTz] = useState(props.inviteeTimezone);
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== props.inviteeTimezone) {
      setInviteeTz(detected);
    }
  }, [props.inviteeTimezone]);
  const [today, setToday] = useState(props.today);
  const [month, setMonth] = useState(() => {
    const [y, m] = props.today.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount to correct to the client's local date
  useEffect(() => {
    const clientToday = format(new Date(), "yyyy-MM-dd");
    if (clientToday !== props.today) {
      setToday(clientToday);
      const [y, m] = clientToday.split("-").map(Number);
      setMonth(new Date(y, m - 1, 1));
    }
  }, []);

  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loadingDays, setLoadingDays] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [newStartUtc, setNewStartUtc] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  const fetchDays = useCallback(
    async (forMonth: Date) => {
      setLoadingDays(true);
      try {
        const res = await fetch(
          `/api/available-days?username=${props.username}&slug=${props.slug}&month=${format(forMonth, "yyyy-MM")}&duration=${props.duration}`
        );
        const data = await res.json();
        setAvailableDates(new Set<string>(data.availableDates ?? []));
      } catch {
        setAvailableDates(new Set());
      } finally {
        setLoadingDays(false);
      }
    },
    [props.username, props.slug, props.duration]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch available days whenever the visible month changes
  useEffect(() => {
    fetchDays(month);
  }, [month]);

  async function fetchSlots(date: string) {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/slots?username=${props.username}&slug=${props.slug}&date=${date}&duration=${props.duration}`
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function isDayAvailable(dateStr: string): boolean {
    if (dateStr < today || dateStr > props.maxDate) {
      return false;
    }
    return availableDates.has(dateStr);
  }

  async function handleConfirm() {
    if (!selectedSlot) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: props.token,
          startUtc: selectedSlot.startUtc,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not reschedule.");
        return;
      }
      setNewStartUtc(data.startUtc);
      setPendingApproval(!!data.requiresApproval);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const currentWhen = formatInTimeZone(
    new Date(props.currentStartUtc),
    inviteeTz,
    DATE_FMT
  );

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md bg-base-100 border border-base-300 overflow-hidden">
          <div className="px-8 py-12 text-center">
            {pendingApproval ? (
              <HourglassMedium
                className="mx-auto text-amber-500"
                size={48}
                weight="fill"
              />
            ) : (
              <CheckCircle
                className="mx-auto text-primary"
                size={48}
                weight="fill"
              />
            )}
            <h1 className="mt-4 text-lg font-bold text-base-content">
              {pendingApproval
                ? "Awaiting host approval"
                : "Booking rescheduled"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingApproval ? (
                <>
                  Your request to reschedule{" "}
                  <strong className="text-base-content">
                    {props.eventName}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-base-content">
                    {newStartUtc &&
                      formatInTimeZone(
                        new Date(newStartUtc),
                        inviteeTz,
                        DATE_FMT
                      )}
                  </strong>{" "}
                  has been sent to {props.hostName} for approval. You'll receive
                  a confirmation email once approved.
                </>
              ) : (
                <>
                  Your {props.eventName} with {props.hostName} is now on{" "}
                  <strong className="text-base-content">
                    {newStartUtc &&
                      formatInTimeZone(
                        new Date(newStartUtc),
                        inviteeTz,
                        DATE_FMT
                      )}
                  </strong>
                  . A confirmation email is on its way.
                </>
              )}
            </p>
          </div>
          <div className="border-t border-base-300 px-5 py-5 sm:px-8">
            <button
              className="flex h-10 w-full items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              onClick={() =>
                window.history.length > 1 ? router.back() : router.push("/")
              }
              type="button"
            >
              <ArrowLeft size={14} />
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
      <div className="w-full max-w-3xl overflow-hidden bg-base-100 border border-base-300">
        <div className="border-b border-base-300 bg-base-200/30 px-5 py-5 sm:px-8">
          <button
            className="mb-4 inline-flex items-center gap-2 border border-base-300 bg-base-100 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
            type="button"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <h1 className="text-base font-bold text-base-content">
            Reschedule your booking
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="text-primary/70" size={13} />
            Currently: {currentWhen} ({inviteeTz})
          </p>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Calendar */}
          <div className="shrink-0 border-b border-base-300 p-6 lg:w-[340px] lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <button
                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-base-content disabled:opacity-30"
                disabled={format(month, "yyyy-MM") <= today.slice(0, 7)}
                onClick={() => setMonth((m) => subMonths(m, 1))}
                type="button"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-sm font-semibold text-base-content">
                {format(month, "MMMM yyyy")}
              </span>
              <button
                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-base-content disabled:opacity-30"
                disabled={
                  format(addMonths(month, 1), "yyyy-MM") >
                  props.maxDate.slice(0, 7)
                }
                onClick={() => setMonth((m) => addMonths(m, 1))}
                type="button"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7">
              {DAY_LABELS.map((d) => (
                <span
                  className="py-1 text-center text-2xs font-bold uppercase tracking-widest text-muted-foreground"
                  key={d}
                >
                  {d}
                </span>
              ))}
            </div>
            <div
              className={cn(
                "grid grid-cols-7 gap-y-0.5 transition-opacity",
                loadingDays && "opacity-40 pointer-events-none"
              )}
            >
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, month);
                const available = inMonth && isDayAvailable(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === today;
                return (
                  <div
                    className="flex items-center justify-center p-0.5"
                    key={dateStr}
                  >
                    <button
                      className={cn(
                        "flex h-10 w-10 items-center justify-center text-sm transition-all",
                        !inMonth && "invisible pointer-events-none",
                        inMonth &&
                          !available &&
                          "cursor-default text-muted-foreground/20",
                        inMonth &&
                          available &&
                          !isSelected &&
                          !isToday &&
                          "cursor-pointer font-medium text-base-content hover:bg-primary/10 hover:text-primary",
                        isToday &&
                          !isSelected &&
                          "cursor-pointer font-bold text-primary ring-2 ring-inset ring-primary",
                        isSelected &&
                          "cursor-pointer bg-primary font-bold text-primary-content"
                      )}
                      disabled={!available}
                      onClick={() => {
                        if (available) {
                          setSelectedDate(dateStr);
                          fetchSlots(dateStr);
                        }
                      }}
                      type="button"
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div className="flex flex-1 flex-col">
            {selectedDate ? (
              <div className="flex flex-1 flex-col">
                <div className="border-b border-base-300 px-6 py-4">
                  <h3 className="text-[15px] font-bold text-base-content">
                    {formatInTimeZone(
                      new Date(`${selectedDate}T12:00:00Z`),
                      inviteeTz,
                      "EEEE, MMMM d"
                    )}
                  </h3>
                </div>
                <div className="lg:max-h-[360px] flex-1 overflow-y-auto p-6">
                  {loadingSlots && (
                    <div className="flex flex-col items-center gap-3 pt-8">
                      <Spinner
                        className="animate-spin text-primary"
                        size={22}
                      />
                      <p className="text-xs text-muted-foreground">
                        Loading times…
                      </p>
                    </div>
                  )}
                  {!loadingSlots && slots.length === 0 && (
                    <p className="pt-8 text-center text-sm text-muted-foreground">
                      No times available. Try another date.
                    </p>
                  )}
                  {!loadingSlots && slots.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {slots.map((slot) => {
                        const isChosen =
                          selectedSlot?.startUtc === slot.startUtc;
                        return (
                          <button
                            className={cn(
                              "flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-all",
                              isChosen
                                ? "bg-primary text-primary-content"
                                : "border border-base-300 bg-base-100 text-base-content hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                            )}
                            key={slot.startUtc}
                            onClick={() => setSelectedSlot(slot)}
                            type="button"
                          >
                            {isChosen && (
                              <CheckCircle size={14} weight="fill" />
                            )}
                            {formatInTimeZone(
                              new Date(slot.startUtc),
                              inviteeTz,
                              "h:mm a"
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {error && (
                  <p className="px-6 pb-2 text-xs text-error">{error}</p>
                )}
                {selectedSlot && (
                  <div className="border-t border-base-300 p-4">
                    <button
                      className="flex h-11 w-full items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-content transition-all hover:bg-primary/90 disabled:opacity-60"
                      disabled={submitting}
                      onClick={handleConfirm}
                      type="button"
                    >
                      {submitting ? (
                        <>
                          <Spinner className="animate-spin" size={15} />
                          Rescheduling…
                        </>
                      ) : (
                        <>
                          Confirm new time
                          <ArrowRight size={15} weight="bold" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
                Pick a date to see available times.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
