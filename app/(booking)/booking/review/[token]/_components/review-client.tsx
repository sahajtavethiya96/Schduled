"use client";

import {
  CalendarBlank,
  Check,
  CheckCircle,
  House,
  Spinner,
  Warning,
  X,
} from "@phosphor-icons/react";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Props {
  approvalToken: string;
  bookingStatus: string;
  eventName: string;
  hostName: string;
  hostTimezone: string;
  initialAction?: "approve" | null;
  inviteeEmail: string;
  inviteeName: string;
  isAlreadyActioned: boolean;
  isPast: boolean;
  locationLabel: string;
  mode?: "booking" | "reschedule";
  requestedStartUtc?: string | null;
  startUtc: string;
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

interface BookingCardProps {
  eventName: string;
  hostTimezone: string;
  inviteeEmail: string;
  inviteeName: string;
  isReschedule: boolean;
  locationLabel: string;
  requestedWhen: string | null;
  when: string;
}

// Booking card shared across views
function BookingCard({
  eventName,
  hostTimezone,
  inviteeEmail,
  inviteeName,
  isReschedule,
  locationLabel,
  requestedWhen,
  when,
}: BookingCardProps) {
  return (
    <div className="mb-5 border border-base-300 bg-base-200/30 p-4">
      <p className="text-sm font-semibold text-base-content">{eventName}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        with {inviteeName} ({inviteeEmail})
      </p>
      {isReschedule && requestedWhen ? (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current
            </p>
            <p className="text-xs text-base-content">{when}</p>
          </div>
          <p className="text-xs text-primary">↓</p>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Requested
            </p>
            <p className="text-xs font-semibold text-base-content">
              {requestedWhen}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{hostTimezone}</p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">{when}</p>
          <p className="text-xs text-muted-foreground">{hostTimezone}</p>
        </>
      )}
      {locationLabel.startsWith("http") ? (
        <a
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
          href={locationLabel}
          rel="noopener noreferrer"
          target="_blank"
        >
          View Location
        </a>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{locationLabel}</p>
      )}
    </div>
  );
}

export function ReviewClient(props: Props) {
  const isReschedule = props.mode === "reschedule";
  const approveEndpoint = isReschedule
    ? "/api/bookings/reschedule-approve"
    : "/api/bookings/approve";
  const rejectEndpoint = isReschedule
    ? "/api/bookings/reschedule-reject"
    : "/api/bookings/reject";

  const autoApproving =
    !props.isAlreadyActioned &&
    !props.isPast &&
    props.initialAction === "approve";

  function initialView():
    | "main"
    | "reject"
    | "approved"
    | "rejected"
    | "invalid" {
    if (!props.isAlreadyActioned) {
      return "main";
    }
    // A reschedule request that's already been actioned/cancelled can't be told
    // apart by status alone — show a neutral "no longer valid" screen.
    if (isReschedule) {
      return "invalid";
    }
    if (props.bookingStatus === "cancelled") {
      return "rejected";
    }
    return "approved";
  }

  const [view, setView] = useState<
    "main" | "reject" | "approved" | "rejected" | "invalid"
  >(initialView);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(autoApproving);
  const [error, setError] = useState<string | null>(null);
  const didAutoApprove = useRef(false);

  // Auto-approve when host clicks the "Approve" link directly from email
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only; didAutoApprove guards against re-runs, and handleApprove/autoApproving would otherwise fire this on every render
  useEffect(() => {
    if (autoApproving && !didAutoApprove.current) {
      didAutoApprove.current = true;
      handleApprove();
    }
  }, []);

  const when = formatInTimeZone(
    new Date(props.startUtc),
    props.hostTimezone,
    DATE_FMT
  );
  const requestedWhen = props.requestedStartUtc
    ? formatInTimeZone(
        new Date(props.requestedStartUtc),
        props.hostTimezone,
        DATE_FMT
      )
    : null;

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(approveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.approvalToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not approve this booking.");
        return;
      }
      setView("approved");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(rejectEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: props.approvalToken,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not decline this booking.");
        return;
      }
      setView("rejected");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Show spinner only while the auto-approve request is in flight. Once it
  // resolves, a failure falls through to the review screen (which shows the
  // error + Approve/Decline) instead of spinning forever.
  if (autoApproving && view === "main" && submitting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-14 text-center">
            <Spinner className="animate-spin text-primary" size={40} />
            <p className="text-sm font-medium text-base-content">
              Approving booking…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (props.isPast) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
            <Warning className="text-amber-500" size={48} weight="fill" />
            <h1 className="text-lg font-bold text-base-content">
              This booking has passed
            </h1>
            <p className="text-sm text-muted-foreground">
              It&apos;s no longer possible to approve or decline a past booking.
            </p>
          </div>
          <div className="border-t border-base-300 px-5 sm:px-8 py-5 flex flex-col sm:flex-row gap-3">
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              href="/dashboard"
            >
              <House size={15} />
              Dashboard
            </Link>
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
              href="/bookings"
            >
              <CalendarBlank size={15} />
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (view === "approved") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
            <CheckCircle className="text-primary" size={48} weight="fill" />
            <h1 className="text-lg font-bold text-base-content">
              {isReschedule ? "Reschedule approved" : "Booking approved"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReschedule
                ? `The meeting has been moved to the new time. ${props.inviteeName} will receive a "Meeting Rescheduled" email.`
                : `${props.inviteeName} will receive a confirmation email with the booking details.`}
            </p>
          </div>
          <div className="border-t border-base-300 px-5 sm:px-8 py-5 flex flex-col sm:flex-row gap-3">
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              href="/dashboard"
            >
              <House size={15} />
              Dashboard
            </Link>
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
              href="/bookings"
            >
              <CalendarBlank size={15} />
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (view === "rejected") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
            <CheckCircle
              className="text-muted-foreground"
              size={48}
              weight="fill"
            />
            <h1 className="text-lg font-bold text-base-content">
              {isReschedule ? "Reschedule declined" : "Booking declined"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReschedule
                ? `The meeting stays at its original time. ${props.inviteeName} will be notified that the reschedule request was declined.`
                : `${props.inviteeName} will be notified that their booking request was declined.`}
            </p>
          </div>
          <div className="border-t border-base-300 px-5 sm:px-8 py-5 flex flex-col sm:flex-row gap-3">
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              href="/dashboard"
            >
              <House size={15} />
              Dashboard
            </Link>
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
              href="/bookings"
            >
              <CalendarBlank size={15} />
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (view === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
            <Warning className="text-amber-500" size={48} weight="fill" />
            <h1 className="text-lg font-bold text-base-content">
              This request is no longer valid
            </h1>
            <p className="text-sm text-muted-foreground">
              This reschedule request has already been handled or the booking
              changed. No action is needed.
            </p>
          </div>
          <div className="border-t border-base-300 px-5 sm:px-8 py-5 flex flex-col sm:flex-row gap-3">
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              href="/dashboard"
            >
              <House size={15} />
              Dashboard
            </Link>
            <Link
              className="flex h-10 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-primary-content transition-opacity hover:opacity-90"
              href="/bookings"
            >
              <CalendarBlank size={15} />
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (view === "reject") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/30 px-5 sm:px-8 py-6">
            <X className="text-error" size={24} weight="bold" />
            <h1 className="text-base font-bold text-base-content">
              {isReschedule
                ? "Decline this reschedule?"
                : "Decline this booking?"}
            </h1>
          </div>
          <div className="px-5 sm:px-8 py-6">
            <BookingCard
              eventName={props.eventName}
              hostTimezone={props.hostTimezone}
              inviteeEmail={props.inviteeEmail}
              inviteeName={props.inviteeName}
              isReschedule={isReschedule}
              locationLabel={props.locationLabel}
              requestedWhen={requestedWhen}
              when={when}
            />

            {isReschedule && (
              <p className="mb-4 text-xs text-muted-foreground">
                The current meeting will stay exactly as it is.
              </p>
            )}

            <label
              className="mb-1.5 block text-xs font-semibold text-muted-foreground"
              htmlFor="reject-reason"
            >
              Reason for declining (optional)
            </label>
            <textarea
              className="w-full resize-none border border-input bg-base-100 px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
              id="reject-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let the invitee know why you're declining…"
              rows={3}
              value={reason}
            />

            {error && <p className="mt-3 text-xs text-error">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                className="flex h-11 flex-1 items-center justify-center border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200 disabled:opacity-60"
                disabled={submitting}
                onClick={() => setView("main")}
                type="button"
              >
                Back
              </button>
              <button
                className="flex h-11 flex-1 items-center justify-center gap-2 bg-error text-sm font-bold text-primary-content transition-all hover:bg-error/90 disabled:opacity-60"
                disabled={submitting}
                onClick={handleReject}
                type="button"
              >
                {submitting ? (
                  <>
                    <Spinner className="animate-spin" size={15} />
                    Declining…
                  </>
                ) : (
                  "Confirm decline"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
      <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
        <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/30 px-5 sm:px-8 py-6">
          <span className="flex size-7 items-center justify-center bg-amber-500/10 text-amber-600">
            <svg fill="currentColor" height="16" viewBox="0 0 16 16" width="16">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
          </span>
          <h1 className="text-base font-bold text-base-content">
            {isReschedule
              ? "Review reschedule request"
              : "Review booking request"}
          </h1>
        </div>

        <div className="px-5 sm:px-8 py-6">
          <p className="mb-5 text-sm text-muted-foreground">
            {isReschedule ? (
              <>
                <strong>{props.inviteeName}</strong> requested to reschedule a
                confirmed meeting. Review the change below and approve or
                decline.
              </>
            ) : (
              <>
                <strong>{props.inviteeName}</strong> has requested to book time
                with you. Review the details below and approve or decline.
              </>
            )}
          </p>

          <BookingCard
            eventName={props.eventName}
            hostTimezone={props.hostTimezone}
            inviteeEmail={props.inviteeEmail}
            inviteeName={props.inviteeName}
            isReschedule={isReschedule}
            locationLabel={props.locationLabel}
            requestedWhen={requestedWhen}
            when={when}
          />

          {error && <p className="mb-4 text-xs text-error">{error}</p>}

          <div className="flex gap-3">
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 bg-error/10 border border-error text-sm font-semibold text-error transition-all hover:bg-error/20 disabled:opacity-60"
              disabled={submitting}
              onClick={() => setView("reject")}
              type="button"
            >
              <X size={16} weight="bold" />
              Decline
            </button>
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-content transition-all hover:bg-primary/90 disabled:opacity-60"
              disabled={submitting}
              onClick={handleApprove}
              type="button"
            >
              {submitting ? (
                <>
                  <Spinner className="animate-spin" size={15} />
                  Approving…
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
