"use client";

import { CheckCircle, GoogleLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { skipCalendarStep } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

interface StepCalendarProps {
  onBack: () => void;
  onNext: () => void;
}

export function StepCalendar({ onNext, onBack }: StepCalendarProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSkip() {
    setLoading(true);
    setError("");
    const result = await skipCalendarStep();
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onNext();
  }

  async function handleConnect() {
    // Save progress first so the OAuth redirect back to /onboarding resumes at step 5.
    setLoading(true);
    setError("");
    const result = await skipCalendarStep();
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = "/api/integrations/google?returnTo=/onboarding";
  }

  return (
    <div className="space-y-6">
      <button
        className="group w-full border border-base-300 bg-base-100 p-5 text-left transition hover:border-primary hover:bg-base-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={handleConnect}
        type="button"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center border border-base-300 bg-base-100">
            <GoogleLogo className="text-[#4285F4]" size={24} weight="bold" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Google Calendar</p>
            <p className="text-sm text-muted-foreground">
              Sync events and block busy times automatically
            </p>
          </div>
        </div>
      </button>

      <ul className="space-y-2 text-sm text-muted-foreground">
        {[
          "Block times when you already have meetings",
          "Add new bookings to your calendar automatically",
          "Generate Google Meet links for video meetings",
        ].map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <CheckCircle
              className="shrink-0 text-primary"
              size={15}
              weight="fill"
            />
            {item}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={loading} onClick={handleConnect}>
          <GoogleLogo className="mr-2" size={16} weight="bold" />
          {loading ? "Connecting…" : "Connect Google Calendar"}
        </Button>
        <Button
          className="w-full text-muted-foreground"
          disabled={loading}
          onClick={handleSkip}
          variant="ghost"
        >
          {loading ? "Saving…" : "Skip for now"}
        </Button>
        <Button
          className="text-muted-foreground"
          disabled={loading}
          onClick={onBack}
          size="sm"
          variant="ghost"
        >
          Back
        </Button>
      </div>
    </div>
  );
}
