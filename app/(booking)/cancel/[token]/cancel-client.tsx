"use client";

import {
  ArrowLeft,
  CalendarX,
  CheckCircle,
  Spinner,
  Warning,
} from "@phosphor-icons/react";
import { formatInTimeZone } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  alreadyCancelled: boolean;
  blockedByPolicy: boolean;
  cutoffHours: number;
  eventName: string;
  hostName: string;
  inviteeName: string;
  inviteeTimezone: string;
  isPast: boolean;
  policyText: string | null;
  requireCancellationReason: boolean;
  showPolicyText: boolean;
  startUtc: string;
  token: string;
}

const DATE_FMT = "EEEE, MMMM d, yyyy 'at' h:mm a";

export function CancelClient(props: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(props.alreadyCancelled);
  const [error, setError] = useState<string | null>(null);

  const when = formatInTimeZone(
    new Date(props.startUtc),
    props.inviteeTimezone,
    DATE_FMT
  );

  async function handleCancel() {
    if (props.requireCancellationReason && !reason.trim()) {
      setError("Please provide a reason for cancellation.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: props.token,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not cancel this booking.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (props.blockedByPolicy) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
          <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
            <Warning className="text-amber-500" size={48} weight="fill" />
            <h1 className="text-lg font-bold text-base-content">
              Cancellation not available
            </h1>
            {props.policyText ? (
              <p className="text-sm text-muted-foreground">{props.policyText}</p>
            ) : props.cutoffHours > 0 ? (
              <p className="text-sm text-muted-foreground">
                This booking cannot be cancelled within{" "}
                <strong>{props.cutoffHours} hours</strong> of the meeting start
                time. Please contact the host directly.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This meeting type does not allow cancellations. Please contact the
                host directly.
              </p>
            )}
          </div>
          <div className="border-t border-base-300 px-5 sm:px-8 py-5">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
              className="flex h-10 w-full items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
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
      <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300">
        {done ? (
          <>
            <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
              <CheckCircle className="text-primary" size={48} weight="fill" />
              <h1 className="text-lg font-bold text-base-content">
                Booking cancelled
              </h1>
              <p className="text-sm text-muted-foreground">
                Your {props.eventName} with {props.hostName} has been cancelled. A
                confirmation email is on its way.
              </p>
            </div>
            <div className="border-t border-base-300 px-5 sm:px-8 py-5">
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
                className="flex h-10 w-full items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              >
                <ArrowLeft size={14} />
                Go Back
              </button>
            </div>
          </>
        ) : props.isPast ? (
          <>
            <div className="flex flex-col items-center gap-4 px-5 sm:px-8 py-12 text-center">
              <Warning className="text-amber-500" size={48} weight="fill" />
              <h1 className="text-lg font-bold text-base-content">
                This booking has passed
              </h1>
              <p className="text-sm text-muted-foreground">
                It&apos;s no longer possible to cancel a meeting that has already
                taken place.
              </p>
            </div>
            <div className="border-t border-base-300 px-5 sm:px-8 py-5">
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
                className="flex h-10 w-full items-center justify-center gap-2 border border-base-300 text-sm font-semibold text-base-content transition-all hover:bg-base-200"
              >
                <ArrowLeft size={14} />
                Go Back
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-base-300 bg-base-200/30 px-5 sm:px-8 py-5">
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
                className="mb-4 inline-flex items-center gap-2 border border-base-300 bg-base-100 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <div className="flex items-center gap-3">
                <CalendarX className="text-error" size={24} />
                <h1 className="text-base font-bold text-base-content">
                  Cancel this booking?
                </h1>
              </div>
            </div>
            <div className="px-5 sm:px-8 py-6">
              <div className="mb-5 border border-base-300 bg-base-200/30 p-4">
                <p className="text-sm font-semibold text-base-content">
                  {props.eventName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  with {props.hostName}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{when}</p>
                <p className="text-xs text-muted-foreground">
                  {props.inviteeTimezone}
                </p>
              </div>

              {props.showPolicyText && props.policyText && (
                <div className="mb-4 border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Cancellation Policy
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {props.policyText}
                  </p>
                </div>
              )}

              <label
                className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                htmlFor="cancel-reason"
              >
                Reason{props.requireCancellationReason
                  ? <span className="text-error ml-0.5">*</span>
                  : <span className="font-normal"> (optional)</span>}
              </label>
              <textarea
                className="w-full resize-none border border-input bg-base-100 px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                id="cancel-reason"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Let the host know why you're cancelling…"
                required={props.requireCancellationReason}
                rows={3}
                value={reason}
              />

              {error && (
                <p className="mt-3 text-xs text-error">{error}</p>
              )}

              <button
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 bg-error text-sm font-bold text-primary-content transition-all hover:bg-error/90 disabled:opacity-60"
                disabled={submitting}
                onClick={handleCancel}
                type="button"
              >
                {submitting ? (
                  <>
                    <Spinner className="animate-spin" size={15} />
                    Cancelling…
                  </>
                ) : (
                  "Cancel booking"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
