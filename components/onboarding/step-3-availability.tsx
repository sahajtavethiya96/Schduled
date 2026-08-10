"use client";

import { Globe, Plus, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { saveAvailabilityStep } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { TimeCombobox } from "@/components/ui/time-combobox";
import { normalizeTzName } from "@/lib/utils";

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DaySchedule = { enabled: boolean; startTime: string; endTime: string };

const DAYS: { key: DayOfWeek; letter: string; label: string }[] = [
  { key: "sunday", letter: "S", label: "Sunday" },
  { key: "monday", letter: "M", label: "Monday" },
  { key: "tuesday", letter: "T", label: "Tuesday" },
  { key: "wednesday", letter: "W", label: "Wednesday" },
  { key: "thursday", letter: "T", label: "Thursday" },
  { key: "friday", letter: "F", label: "Friday" },
  { key: "saturday", letter: "S", label: "Saturday" },
];

const DEFAULT: Record<DayOfWeek, DaySchedule> = {
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};

interface StepAvailabilityProps {
  onBack: () => void;
  onNext: () => void;
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TimeCombobox
      format={fmt12}
      onChange={onChange}
      triggerClassName="w-[92px]"
      value={value}
    />
  );
}

export function StepAvailability({ onNext, onBack }: StepAvailabilityProps) {
  const [schedule, setSchedule] =
    useState<Record<DayOfWeek, DaySchedule>>(DEFAULT);
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTimezone(detectTimezone());
  }, []);

  function toggleDay(day: DayOfWeek) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  }

  function updateTime(
    day: DayOfWeek,
    field: "startTime" | "endTime",
    value: string
  ) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const invalidDay = Object.entries(schedule).find(
      ([, d]) => d.enabled && d.startTime >= d.endTime
    );
    if (invalidDay) {
      const label =
        DAYS.find((d) => d.key === invalidDay[0])?.label ?? invalidDay[0];
      setError(`${label}: end time must be after start time.`);
      setSaving(false);
      return;
    }
    const result = await saveAvailabilityStep(schedule);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onNext();
  }

  const tzDisplay = normalizeTzName(timezone);

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Day rows */}
      <div className="space-y-3">
        {DAYS.map(({ key, letter, label }) => {
          const day = schedule[key];
          return (
            <div
              aria-label={label}
              className="flex items-center gap-3"
              key={key}
            >
              {/* Day badge */}
              <div
                className={[
                  "flex size-8 shrink-0 items-center justify-center text-xs font-bold select-none",
                  day.enabled
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-muted-foreground",
                ].join(" ")}
              >
                {letter}
              </div>

              {day.enabled ? (
                <>
                  {/* Time range */}
                  <div className="flex flex-1 items-center gap-2">
                    <TimeSelect
                      onChange={(v) => updateTime(key, "startTime", v)}
                      value={day.startTime}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <TimeSelect
                      onChange={(v) => updateTime(key, "endTime", v)}
                      value={day.endTime}
                    />
                  </div>

                  {/* Remove slot */}
                  <button
                    aria-label={`Remove ${label}`}
                    className="shrink-0 p-1 text-muted-foreground transition hover:text-base-content hover:bg-base-200"
                    onClick={() => toggleDay(key)}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-muted-foreground">
                    Unavailable
                  </span>

                  {/* Add slot */}
                  <button
                    aria-label={`Add hours for ${label}`}
                    className="shrink-0 p-1 text-muted-foreground transition hover:text-base-content hover:bg-base-200"
                    onClick={() => toggleDay(key)}
                    type="button"
                  >
                    <Plus size={15} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Timezone hint */}
      {timezone && (
        <div className="flex items-center gap-2 border-t border-base-300 pt-4 text-sm text-muted-foreground">
          <Globe className="shrink-0 text-primary" size={15} />
          <span className="truncate">{tzDisplay}</span>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={saving} type="submit">
          {saving ? "Saving…" : "Continue"}
        </Button>
        <Button
          className="text-muted-foreground"
          onClick={onBack}
          size="sm"
          type="button"
          variant="ghost"
        >
          Back
        </Button>
      </div>
    </form>
  );
}
