"use client";

import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Globe,
  House,
  Lightning,
  Link as LinkIcon,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Phone,
  Spinner,
  VideoCamera,
} from "@phosphor-icons/react";
import {
  addDays,
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
import Image from "next/image";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_NAME } from "@/config/platform";
import { cn, dialCodeFromTz, normalizeTzName } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HostInfo {
  company?: string | null;
  id: string;
  image: string | null;
  jobTitle?: string | null;
  name: string;
  username: string;
}

interface Question {
  id: string;
  isRequired: boolean;
  label: string;
  options: string[] | null;
  placeholder: string | null;
  type: string;
}

interface DurationOption {
  duration: number;
  isDefault: boolean;
}

interface EventTypeInfo {
  bookingWindow: number;
  color: string;
  description: string | null;
  durations: DurationOption[];
  id: string;
  locationType: string;
  locationValue: string | null;
  name: string;
  policyText: string | null;
  questions: Question[];
  slug: string;
}

interface SlotInfo {
  endUtc: string;
  startUtc: string;
}

type Step = "calendar" | "form";

interface Props {
  availableDaysOfWeek: string[];
  blockedDates: string[];
  eventType: EventTypeInfo;
  host: HostInfo;
  isOwner: boolean;
  maxDate: string;
  showPoweredBy?: boolean;
  specialDates: string[];
  today: string; // server-rendered initial value; corrected client-side on mount
}

// ── Outer helpers (stable identity — no remount on every render) ──────────────

const inputCls =
  "w-full border border-input bg-base-100 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60";

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-base-content">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
    </div>
  );
}

function QuestionInput({
  q,
  answers,
  setAnswers,
}: {
  q: Question;
  answers: Record<string, string | string[]>;
  setAnswers: React.Dispatch<
    React.SetStateAction<Record<string, string | string[]>>
  >;
}) {
  const strVal = Array.isArray(answers[q.id])
    ? ""
    : ((answers[q.id] as string) ?? "");

  if (q.type === "long_text") {
    return (
      <textarea
        className={`${inputCls} resize-none py-2`}
        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
        placeholder={q.placeholder ?? ""}
        required={q.isRequired}
        rows={3}
        value={strVal}
      />
    );
  }
  if (q.type === "single_select" || q.type === "dropdown") {
    return (
      <Select
        onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
        value={strVal || undefined}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {q.options?.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (q.type === "multiple_select") {
    return (
      <div className="flex flex-col gap-1.5">
        {q.options?.map((opt) => {
          const arr = Array.isArray(answers[q.id])
            ? (answers[q.id] as string[])
            : [];
          return (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-base-content"
              key={opt}
            >
              <Checkbox
                checked={arr.includes(opt)}
                onCheckedChange={(checked) => {
                  const cur = Array.isArray(answers[q.id])
                    ? (answers[q.id] as string[])
                    : [];
                  setAnswers((p) => ({
                    ...p,
                    [q.id]:
                      checked === true
                        ? [...cur, opt]
                        : cur.filter((v) => v !== opt),
                  }));
                }}
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }
  const typeMap: Record<string, string> = {
    number: "number",
    date: "date",
    url: "url",
  };
  return (
    <input
      className={`${inputCls} h-9`}
      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
      placeholder={q.placeholder ?? ""}
      required={q.isRequired}
      type={typeMap[q.type] ?? "text"}
      value={strVal}
    />
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const STEPS = ["Date", "Time", "Details"];

// Build the full searchable timezone list once at module load (client-only).
// Each entry carries a pre-computed offset string and search key so filtering
// is cheap: no per-keystroke Intl calls.
interface TzEntry {
  city: string;
  label: string;
  searchKey: string;
  tz: string;
}

function buildTzList(): TzEntry[] {
  const now = new Date();
  let zones: string[];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zones = (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    zones = [
      "Pacific/Honolulu",
      "America/Anchorage",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Helsinki",
      "Europe/Moscow",
      "Asia/Dubai",
      "Asia/Karachi",
      "Asia/Kolkata",
      "Asia/Dhaka",
      "Asia/Bangkok",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Australia/Perth",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  }

  const offsetMinutes = (tz: string): number => {
    // Compute numeric UTC offset for sort
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      }).formatToParts(now);
      const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
      const m = raw.match(/([+-])(\d+):(\d+)/);
      if (!m) {
        return 0;
      }
      return (
        (m[1] === "-" ? -1 : 1) *
        (Number.parseInt(m[2]) * 60 + Number.parseInt(m[3]))
      );
    } catch {
      return 0;
    }
  };

  return zones
    .map((tz) => {
      let offset = "UTC";
      try {
        const parts = new Intl.DateTimeFormat("en", {
          timeZone: tz,
          timeZoneName: "shortOffset",
        }).formatToParts(now);
        offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
      } catch {
        /* keep UTC */
      }
      const city = normalizeTzName(tz).split("/").pop() ?? normalizeTzName(tz);
      const label = `${city} (${offset})`;
      const searchKey = `${tz.toLowerCase().replace(/_/g, " ")} ${offset.toLowerCase()}`;
      return { tz, city, label, searchKey };
    })
    .sort((a, b) => offsetMinutes(a.tz) - offsetMinutes(b.tz));
}

const ALL_TIMEZONES: TzEntry[] =
  typeof window === "undefined" ? [] : buildTzList();

// ── Timezone Search Component ─────────────────────────────────────────────────

function TimezoneSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const list = useMemo(() => {
    if (!ALL_TIMEZONES.length) {
      return [];
    }
    if (!search.trim()) {
      return ALL_TIMEZONES;
    }
    const q = search.toLowerCase().replace(/[_/]/g, " ");
    return ALL_TIMEZONES.filter((e) => e.searchKey.includes(q));
  }, [search]);

  // ALL_TIMEZONES is empty during SSR (built only in the browser), so the first
  // client render must match the server's plain-city fallback to avoid a
  // hydration mismatch; the offset-rich label is applied after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentLabel = useMemo(() => {
    const fallback = value.split("/").pop()?.replace(/_/g, " ") ?? value;
    if (!mounted) {
      return fallback;
    }
    const found = ALL_TIMEZONES.find((e) => e.tz === value);
    return found ? found.label : fallback;
  }, [value, mounted]);

  useEffect(() => {
    if (open) {
      // Focus input and scroll selected item into view after paint
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        selectedRef.current?.scrollIntoView({ block: "nearest" });
      });
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="flex w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-base-content transition-colors"
          type="button"
        >
          <Globe className="shrink-0" size={14} />
          <span className="flex-1 truncate text-left">{currentLabel}</span>
          <CaretDown className="shrink-0 opacity-60" size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-72 p-0 sm:w-72"
        onOpenAutoFocus={(e) => e.preventDefault()}
        side="top"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2">
          <MagnifyingGlass
            className="shrink-0 text-muted-foreground"
            size={14}
          />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city or timezone…"
            ref={inputRef}
            value={search}
          />
          {search && (
            <button
              className="text-muted-foreground/60 hover:text-base-content transition-colors"
              onClick={() => setSearch("")}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Timezone list */}
        <div className="max-h-60 overflow-y-auto">
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No timezones found
            </p>
          ) : (
            list.map((entry) => {
              const isSelected = entry.tz === value;
              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-base-200",
                    isSelected && "bg-primary/8 font-medium text-primary"
                  )}
                  key={entry.tz}
                  onClick={() => {
                    onChange(entry.tz);
                    setOpen(false);
                  }}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                >
                  <span className="truncate">{entry.label}</span>
                  {isSelected && (
                    <Check className="ml-2 shrink-0" size={13} weight="bold" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {!search && (
          <p className="border-t border-base-300 px-3 py-2 text-xs text-muted-foreground/60">
            {ALL_TIMEZONES.length} timezones · type to search
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function locationMeta(type: string): { icon: React.ReactNode; label: string } {
  if (type === "zoom" || type === "google_meet") {
    return {
      icon: <VideoCamera size={13} />,
      label: type === "zoom" ? "Zoom" : "Google Meet",
    };
  }
  if (type === "phone_host_calls") {
    return { icon: <Phone size={13} />, label: "Phone (host calls you)" };
  }
  if (type === "phone_invitee_calls") {
    return { icon: <Phone size={13} />, label: "Phone call" };
  }
  if (type === "in_person") {
    return { icon: <MapPin size={13} />, label: "In-person meeting" };
  }
  return { icon: <LinkIcon size={13} />, label: "Online" };
}

const POLICY_PREVIEW = 110;

function PolicyBox({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > POLICY_PREVIEW;
  const displayed =
    !expanded && needsTruncation
      ? text.slice(0, POLICY_PREVIEW).trimEnd() + "…"
      : text;

  return (
    <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Cancellation Policy
      </p>
      <p className="break-words text-xs leading-relaxed text-amber-700/80 dark:text-amber-400">
        {displayed}
      </p>
      {needsTruncation && (
        <button
          className="mt-1.5 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? "Show less" : "Learn more"}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BookingCalendar({
  isOwner,
  host,
  eventType,
  today: todayProp,
  maxDate,
  availableDaysOfWeek,
  blockedDates,
  specialDates,
  showPoweredBy = true,
}: Props) {
  const defaultDuration =
    eventType.durations.find((d) => d.isDefault)?.duration ??
    eventType.durations[0]?.duration ??
    30;

  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [inviteeTz, setInviteeTz] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [step, setStep] = useState<Step>("calendar");

  // today is initialised from the server prop then corrected on the client to
  // the invitee's local date (browser timezone), not the host timezone.
  const [today, setToday] = useState(todayProp);
  const [month, setMonth] = useState(() => {
    const [y, m] = todayProp.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  useEffect(() => {
    const clientToday = format(new Date(), "yyyy-MM-dd");
    if (clientToday !== todayProp) {
      setToday(clientToday);
      const [y, m] = clientToday.split("-").map(Number);
      setMonth(new Date(y, m - 1, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Available dates fetched per-month from the server (factors in real bookings)
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(
    new Set()
  );
  const [loadingDays, setLoadingDays] = useState(false);

  const fetchAvailableDays = useCallback(
    async (forMonth: Date) => {
      const monthStr = format(forMonth, "yyyy-MM");
      setLoadingDays(true);
      try {
        const res = await fetch(
          `/api/available-days?username=${host.username}&slug=${eventType.slug}&month=${monthStr}&duration=${selectedDuration}`
        );
        const data = await res.json();
        setAvailableDatesSet(new Set<string>(data.availableDates ?? []));
      } catch {
        setAvailableDatesSet(new Set());
      } finally {
        setLoadingDays(false);
      }
    },
    [host.username, eventType.slug, selectedDuration]
  );

  useEffect(() => {
    fetchAvailableDays(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedDuration]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [pendingTimeRestore, setPendingTimeRestore] = useState<string | null>(
    null
  );
  const hasRestoredFromUrl = useRef(false);

  const slotsPanelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [emailBlocked, setEmailBlocked] = useState(false);
  const [checkingBlocked, setCheckingBlocked] = useState(false);

  // Return-booker pre-fill: debounce email → lookup contact + blocklist check
  useEffect(() => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      setPrefilled(false);
      setEmailBlocked(false);
      return;
    }

    const controller = new AbortController();
    setCheckingBlocked(true);
    const timer = setTimeout(async () => {
      try {
        const [lookupRes, blockedRes] = await Promise.all([
          fetch(
            `/api/contact-lookup?username=${encodeURIComponent(host.username)}&email=${encodeURIComponent(email)}`,
            { signal: controller.signal }
          ),
          fetch(
            `/api/check-blocked?username=${encodeURIComponent(host.username)}&email=${encodeURIComponent(email)}`,
            { signal: controller.signal }
          ),
        ]);
        const [lookupData, blockedData] = await Promise.all([
          lookupRes.json(),
          blockedRes.json(),
        ]);
        if (lookupData.found) {
          if (lookupData.name && !name) {
            setName(lookupData.name);
          }
          setPrefilled(true);
        } else {
          setPrefilled(false);
        }
        setEmailBlocked(!!blockedData.blocked);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      } finally {
        setCheckingBlocked(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const availableDowSet = new Set(availableDaysOfWeek);
  const blockedSet = new Set(blockedDates);
  const specialSet = new Set(specialDates);

  const progressStep = step === "form" ? 3 : selectedDate ? 2 : 1;

  // "Back" leaves the booking page entirely — returns the host to wherever they
  // came from (event-type list / dashboard). Falls back to the host's profile.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = `/${host.username}`;
    }
  }

  const [copyLinkDone, setCopyLinkDone] = useState(false);
  function copyPageLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLinkDone(true);
      setTimeout(() => setCopyLinkDone(false), 2000);
    });
  }

  // ── URL sync ────────────────────────────────────────────────────────────────

  function syncUrl(date: string | null, slot: SlotInfo | null, mth: Date) {
    if (typeof window === "undefined") {
      return;
    }
    const p = new URLSearchParams();
    p.set("month", format(mth, "yyyy-MM"));
    if (date) {
      p.set("date", date);
    }
    if (slot) {
      p.set("time", slot.startUtc);
    }
    window.history.replaceState(
      null,
      "",
      window.location.pathname + "?" + p.toString()
    );
  }

  // Restore state from URL params on first mount (inline fetch avoids forward-ref to fetchSlots)
  useEffect(() => {
    if (hasRestoredFromUrl.current) {
      return;
    }
    hasRestoredFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const monthParam = params.get("month");
    const dateParam = params.get("date");
    const timeParam = params.get("time");
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setMonth(new Date(y, m - 1, 1));
      }
    }
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setSelectedDate(dateParam);
      // Inline slot fetch (can't reference fetchSlots useCallback — declared later)
      setLoadingSlots(true);
      fetch(
        `/api/slots?username=${host.username}&slug=${eventType.slug}&date=${dateParam}&duration=${selectedDuration}`
      )
        .then((r) => r.json())
        .then((data) => {
          const raw: SlotInfo[] = data.slots ?? [];
          const seen = new Set<string>();
          setSlots(
            raw.filter((s) => {
              if (seen.has(s.startUtc)) {
                return false;
              }
              seen.add(s.startUtc);
              return true;
            })
          );
        })
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    }
    if (timeParam) {
      setPendingTimeRestore(timeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After slots load, match the pending time param (URL-restored slot)
  useEffect(() => {
    if (!pendingTimeRestore || slots.length === 0) {
      return;
    }
    const match = slots.find((s) => s.startUtc === pendingTimeRestore);
    if (match) {
      setSelectedSlot(match);
    }
    setPendingTimeRestore(null);
  }, [slots, pendingTimeRestore]);

  // ── Month navigation (with URL sync) ───────────────────────────────────────

  function handlePrevMonth() {
    setMonth((m) => {
      const next = subMonths(m, 1);
      syncUrl(selectedDate, selectedSlot, next);
      return next;
    });
  }

  function handleNextMonth() {
    setMonth((m) => {
      const next = addMonths(m, 1);
      syncUrl(selectedDate, selectedSlot, next);
      return next;
    });
  }

  function handleSlotClick(slot: SlotInfo) {
    setSelectedSlot(slot);
    syncUrl(selectedDate, slot, month);
  }

  function handleDurationChange(d: number) {
    setSelectedDuration(d);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setStep("calendar");
    // Reset URL to base path (no date/time selection)
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  function isDayAvailable(dateStr: string): boolean {
    if (dateStr < today || dateStr > maxDate) {
      return false;
    }
    if (blockedSet.has(dateStr)) {
      return false;
    }
    // Once the server has responded, use its confirmed set (accounts for real bookings)
    if (!loadingDays) {
      return availableDatesSet.has(dateStr);
    }
    // Optimistic fallback while loading: DOW + special-date check
    if (specialSet.has(dateStr)) {
      return true;
    }
    const dayName = format(
      new Date(`${dateStr}T12:00:00Z`),
      "EEEE"
    ).toLowerCase();
    return availableDowSet.has(dayName);
  }

  const quickPicks = (() => {
    const picks: { label: string; sub: string; date: string }[] = [];
    const labels = ["Today", "Tomorrow"];
    for (let i = 0; i <= 14; i++) {
      if (picks.length >= 3) {
        break;
      }
      const d = addDays(new Date(`${today}T12:00:00Z`), i);
      const dStr = format(d, "yyyy-MM-dd");
      if (isDayAvailable(dStr)) {
        const label = i < 2 ? labels[i] : format(d, "EEEE");
        picks.push({ label, sub: format(d, "MMM d"), date: dStr });
      }
    }
    return picks;
  })();

  const fetchSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const res = await fetch(
          `/api/slots?username=${host.username}&slug=${eventType.slug}&date=${date}&duration=${selectedDuration}`
        );
        const data = await res.json();
        const raw: SlotInfo[] = data.slots ?? [];
        const seen = new Set<string>();
        setSlots(
          raw.filter((s) => {
            if (seen.has(s.startUtc)) {
              return false;
            }
            seen.add(s.startUtc);
            return true;
          })
        );
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [host.username, eventType.slug, selectedDuration]
  );

  function handleDateClick(dateStr: string) {
    if (!isDayAvailable(dateStr)) {
      return;
    }
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    fetchSlots(dateStr);
    syncUrl(dateStr, null, month);
    // On mobile, the slots panel is below the calendar — scroll to it
    setTimeout(() => {
      slotsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function handleContinue() {
    if (!selectedSlot) {
      return;
    }
    setStep("form");
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      return;
    }

    // Phone-type questions are collected via the dedicated phone field below,
    // not the generic answers map — exclude them from this loop or a required
    // phone question would be permanently unsubmittable.
    for (const q of eventType.questions.filter(
      (q) => q.isRequired && q.type !== "phone"
    )) {
      const ans = answers[q.id];
      const val = Array.isArray(ans) ? ans.join("") : (ans ?? "");
      if (!val.trim()) {
        setSubmitError(`"${q.label}" is required`);
        return;
      }
    }
    const phoneQ = eventType.questions.find((q) => q.type === "phone");
    const needsPhone = eventType.locationType === "phone_host_calls";
    const phoneRequired = needsPhone || (phoneQ?.isRequired ?? false);
    if (phoneRequired && !phone.trim()) {
      setSubmitError(
        needsPhone
          ? "Phone number is required for this meeting type"
          : `"${phoneQ?.label ?? "Phone"}" is required`
      );
      return;
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        setPhoneError(
          digits.length > 15
            ? "Phone number is too long (max 15 digits)."
            : "Phone number is too short (min 7 digits)."
        );
        setSubmitError("Please enter a valid phone number.");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    const answersPayload = eventType.questions
      .map((q) => {
        // Phone-type questions are answered via the dedicated phone field.
        if (q.type === "phone") {
          return {
            questionId: q.id,
            questionLabel: q.label,
            answer: phone.trim(),
          };
        }
        const ans = answers[q.id];
        return {
          questionId: q.id,
          questionLabel: q.label,
          answer: Array.isArray(ans) ? ans.join(", ") : (ans ?? ""),
        };
      })
      .filter((a) => a.answer);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: host.username,
          eventSlug: eventType.slug,
          startUtc: selectedSlot.startUtc,
          duration: selectedDuration,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          timezone: inviteeTz,
          answers: answersPayload,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (res.status === 403) {
          setSubmitError("__blocked__");
        } else {
          setSubmitError(data.error ?? "Booking failed.");
        }
        return;
      }
      const p = new URLSearchParams({
        host: host.name,
        slug: host.username,
        event: eventType.name,
        ets: eventType.slug,
        etid: eventType.id,
        start: data.startUtc,
        end: data.endUtc,
        tz: inviteeTz,
        cancel: data.cancelToken,
        reschedule: data.rescheduleToken,
        loc: eventType.locationType,
        ...(data.locationValue ? { locValue: data.locationValue } : {}),
        ...(data.isPending ? { pending: "1" } : {}),
      });
      window.location.href = `/confirmed?${p.toString()}`;
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Calendar grid data ─────────────────────────────────────────────────────

  if (availableDaysOfWeek.length === 0 && specialDates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100 p-6">
        <div className="w-full max-w-sm border border-base-300 bg-base-100 p-8 text-center">
          <CalendarBlank
            className="mx-auto mb-4 text-muted-foreground/40"
            size={40}
          />
          <h2 className="text-base font-semibold text-base-content">
            {host.name} isn&apos;t available right now
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This booking page is not currently accepting new meetings. Please
            check back later or contact the host directly.
          </p>
        </div>
      </div>
    );
  }

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const loc = locationMeta(eventType.locationType);
  const hostCompany = [host.jobTitle, host.company].filter(Boolean).join(" @ ");
  const needsPhone = eventType.locationType === "phone_host_calls";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-base-100 p-4 md:p-6 lg:flex lg:h-screen lg:items-center lg:overflow-hidden lg:p-8">
      {/* Decorative blur circles */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[8%] top-[6%] h-80 w-80 bg-teal-400/[0.09] blur-[90px]" />
        <div className="absolute left-[4%] bottom-[15%] h-60 w-60 bg-teal-300/[0.07] blur-[70px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 mx-auto w-full max-w-[900px] overflow-hidden bg-base-100 border border-base-300 lg:flex lg:h-full lg:max-h-[680px] lg:flex-col">
        {/* ── Progress bar ── */}
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-3">
          {/* Back — shown only to the host previewing their own page; returns
              them to the event-type list / dashboard they came from. */}
          <div className="flex w-24 shrink-0 justify-start">
            {isOwner && (
              <button
                aria-label="Go back"
                className="flex items-center gap-1.5 border border-base-300 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft size={14} weight="bold" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          {/* Steps — centered */}
          <div className="flex flex-1 items-center justify-center gap-0">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < progressStep;
              const active = n === progressStep;
              return (
                <React.Fragment key={label}>
                  {i > 0 && (
                    <div
                      className={cn(
                        "h-px flex-1 transition-colors",
                        done ? "bg-primary/50" : "bg-base-300"
                      )}
                    />
                  )}
                  <div className="flex items-center gap-1.5 px-1">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center text-xs font-bold transition-all",
                        done && "bg-primary text-white",
                        active &&
                          "bg-primary text-white ring-[3px] ring-primary/20 ring-offset-1",
                        !done && !active && "bg-base-200 text-muted-foreground"
                      )}
                    >
                      {done ? <CheckCircle size={10} weight="bold" /> : n}
                    </div>
                    <span
                      className={cn(
                        "hidden text-xs font-medium sm:block",
                        active
                          ? "text-primary"
                          : done
                            ? "text-primary/60"
                            : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right — owner toolbar (Menu + Copy link) or empty spacer to balance left */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 min-w-24">
            {isOwner && (
              <>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 border border-base-300 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
                      type="button"
                    >
                      Menu
                      <CaretDown size={11} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    <DropdownMenuItem asChild>
                      <Link
                        className="flex items-center gap-2"
                        href="/dashboard"
                      >
                        <House size={14} />
                        Home
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        className="flex items-center gap-2"
                        href={`/event-types/${eventType.id}`}
                      >
                        <PencilSimple size={14} />
                        Edit event type
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  className="flex items-center gap-1.5 border border-base-300 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary sm:w-[104px] sm:justify-center"
                  onClick={copyPageLink}
                  type="button"
                >
                  {copyLinkDone ? (
                    <Check
                      className="text-primary shrink-0"
                      size={13}
                      weight="bold"
                    />
                  ) : (
                    <Copy className="shrink-0" size={13} />
                  )}
                  <span className="hidden sm:inline">
                    {copyLinkDone ? "Copied!" : "Copy link"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* ── Left info panel ── */}
          <div className="flex shrink-0 flex-col gap-0 overflow-x-hidden border-b border-base-300 bg-base-100 lg:w-[230px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
            <div className="flex min-w-0 flex-col gap-5 p-6">
              {/* Avatar */}
              {host.image ? (
                <Image
                  alt={host.name}
                  className="h-12 w-12 rounded-none object-cover ring-1 ring-base-300"
                  height={48}
                  src={host.image}
                  width={48}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-none bg-primary text-xl font-bold text-white ring-1 ring-base-300">
                  {host.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Host identity */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Meeting with
                </p>
                <p className="mt-0.5 text-sm font-bold text-base-content">
                  {host.name}
                </p>
                {hostCompany && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase className="shrink-0" size={11} />
                    {hostCompany}
                  </p>
                )}
              </div>

              <div className="-mx-6 border-t border-base-300" />

              {/* Event info */}
              <div>
                <h1 className="text-[15px] font-bold leading-snug text-base-content">
                  {eventType.name}
                </h1>
                {eventType.description && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {eventType.description}
                  </p>
                )}
                {eventType.policyText && (
                  <PolicyBox text={eventType.policyText} />
                )}
              </div>

              {/* Duration picker — show chips only if multiple durations */}
              {eventType.durations.length > 1 ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Duration
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {eventType.durations.map((d) => (
                      <button
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border transition-all",
                          selectedDuration === d.duration
                            ? "bg-primary border-primary text-white"
                            : "border-base-300 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        )}
                        key={d.duration}
                        onClick={() => handleDurationChange(d.duration)}
                        type="button"
                      >
                        <Clock className="shrink-0" size={10} />
                        {d.duration} min
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Meta */}
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="shrink-0 text-primary/70" size={13} />
                  {selectedDuration} minutes
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 text-primary/70">{loc.icon}</span>
                  {loc.label}
                </span>
                {/* Gated on locationType, not just locationValue — the field
                    isn't cleared client-side when a host switches away from
                    in-person/custom, so a stale address/link can still be
                    sitting in the column for a Zoom/phone event type. */}
                {(eventType.locationType === "in_person" ||
                  eventType.locationType === "custom") &&
                  eventType.locationValue && (
                    <span className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin
                        className="mt-0.5 shrink-0 text-primary/70"
                        size={13}
                      />
                      {eventType.locationValue.startsWith("http") ? (
                        <a
                          className="break-all text-primary underline-offset-2 hover:underline"
                          href={eventType.locationValue}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          View location
                        </a>
                      ) : (
                        <span className="break-words">
                          {eventType.locationValue}
                        </span>
                      )}
                    </span>
                  )}
                {step === "form" && selectedSlot && (
                  <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <CheckCircle className="shrink-0" size={13} weight="fill" />
                    <span>
                      {formatInTimeZone(
                        new Date(selectedSlot.startUtc),
                        inviteeTz,
                        "EEE, MMM d"
                      )}
                      {" · "}
                      {formatInTimeZone(
                        new Date(selectedSlot.startUtc),
                        inviteeTz,
                        "h:mm a"
                      )}
                      {" – "}
                      {formatInTimeZone(
                        new Date(selectedSlot.endUtc),
                        inviteeTz,
                        "h:mm a"
                      )}
                    </span>
                  </span>
                )}
              </div>

              <div className="-mx-6 border-t border-base-300" />

              {/* Available days chips */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Available
                </p>
                <div className="flex flex-wrap gap-1">
                  {ALL_DAYS.map((d, i) => (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-semibold transition-colors",
                        availableDowSet.has(d)
                          ? "bg-primary/10 text-primary"
                          : "bg-base-200 text-muted-foreground/30"
                      )}
                      key={d}
                    >
                      {DAY_LABELS[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Calendar panel (hidden in form step) ── */}
          {step !== "form" && (
            <div className="shrink-0 border-b border-base-300 p-6 lg:w-[320px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
              <h2 className="mb-5 text-sm font-semibold text-base-content">
                Select a Date &amp; Time
              </h2>

              {/* Month nav */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-base-content disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={format(month, "yyyy-MM") <= today.slice(0, 7)}
                  onClick={handlePrevMonth}
                >
                  <CaretLeft size={14} weight="bold" />
                </button>
                <span className="text-sm font-semibold text-base-content">
                  {format(month, "MMMM yyyy")}
                </span>
                <button
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-base-content disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={
                    format(addMonths(month, 1), "yyyy-MM") > maxDate.slice(0, 7)
                  }
                  onClick={handleNextMonth}
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>

              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7">
                {DAY_LABELS.map((d) => (
                  <span
                    className="py-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground"
                    key={d}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Day grid */}
              <div
                className={cn(
                  "grid grid-cols-7 gap-y-0.5 transition-opacity duration-200",
                  loadingDays && "opacity-40 pointer-events-none"
                )}
              >
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const inMonth = isSameMonth(day, month);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === today;
                  const available = inMonth && isDayAvailable(dateStr);

                  return (
                    <div
                      className="flex items-center justify-center p-1"
                      key={dateStr}
                    >
                      <button
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center text-sm transition-all duration-150",
                          !inMonth && "invisible pointer-events-none",
                          // Unavailable: grey (ring if it's today so user knows it's today)
                          inMonth &&
                            !available &&
                            !isToday &&
                            "cursor-default text-muted-foreground/20",
                          inMonth &&
                            !available &&
                            isToday &&
                            "cursor-default font-bold text-muted-foreground/30 ring-2 ring-inset ring-muted-foreground/20",
                          // Available, not today, not selected
                          inMonth &&
                            available &&
                            !isSelected &&
                            !isToday &&
                            "cursor-pointer font-medium text-base-content hover:bg-primary/10 hover:text-primary",
                          // Available, is today, not selected
                          inMonth &&
                            available &&
                            isToday &&
                            !isSelected &&
                            "cursor-pointer font-bold text-primary ring-2 ring-inset ring-primary",
                          // Selected
                          isSelected &&
                            "cursor-pointer bg-primary font-bold text-white"
                        )}
                        disabled={!available}
                        onClick={() => handleDateClick(dateStr)}
                      >
                        {format(day, "d")}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Timezone picker */}
              <div className="mt-5 border-t border-base-300 pt-4">
                <TimezoneSearch onChange={setInviteeTz} value={inviteeTz} />
              </div>
            </div>
          )}

          {/* ── Slots panel ── */}
          {step === "calendar" && (
            <div
              className="flex flex-1 flex-col overflow-hidden"
              ref={slotsPanelRef}
            >
              {selectedDate ? (
                /* Slot list */
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="shrink-0 border-b border-base-300 px-6 py-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatInTimeZone(
                        new Date(`${selectedDate}T12:00:00Z`),
                        inviteeTz,
                        "EEEE"
                      )}
                    </p>
                    <h3 className="text-[15px] font-bold text-base-content">
                      {formatInTimeZone(
                        new Date(`${selectedDate}T12:00:00Z`),
                        inviteeTz,
                        "MMMM d, yyyy"
                      )}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin]">
                    {loadingSlots && (
                      <div className="flex flex-col items-center gap-3 pt-8">
                        <Spinner
                          className="animate-spin text-primary"
                          size={22}
                        />
                        <p className="text-xs text-muted-foreground">
                          Loading available times…
                        </p>
                      </div>
                    )}

                    {!loadingSlots && slots.length === 0 && (
                      <div className="flex flex-col items-center gap-2 pt-8 text-center">
                        <CalendarBlank
                          className="text-muted-foreground/30"
                          size={28}
                        />
                        <p className="text-sm font-medium text-muted-foreground">
                          No times available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try a different date
                        </p>
                      </div>
                    )}

                    {!loadingSlots && slots.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {slots.map((slot) => {
                          const start = formatInTimeZone(
                            new Date(slot.startUtc),
                            inviteeTz,
                            "h:mm a"
                          );
                          const end = formatInTimeZone(
                            new Date(slot.endUtc),
                            inviteeTz,
                            "h:mm a"
                          );
                          const isChosen =
                            selectedSlot?.startUtc === slot.startUtc;
                          return (
                            <button
                              className={cn(
                                "flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-all duration-150",
                                isChosen
                                  ? "bg-primary text-white"
                                  : "border border-base-300 bg-base-100 text-base-content hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                              )}
                              key={slot.startUtc}
                              onClick={() => handleSlotClick(slot)}
                            >
                              {isChosen && (
                                <CheckCircle size={14} weight="fill" />
                              )}
                              {start}
                              <span
                                className={cn(
                                  "text-xs font-normal",
                                  isChosen
                                    ? "text-white/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                – {end}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Continue CTA */}
                  {selectedSlot && (
                    <div className="shrink-0 border-t border-base-300 bg-base-100 p-4">
                      <button
                        className="flex h-11 w-full items-center justify-center gap-2 bg-primary text-sm font-bold text-white transition-all hover:bg-primary/90"
                        onClick={handleContinue}
                      >
                        Continue
                        <ArrowRight size={15} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Quick pick — no date selected */
                <div className="flex flex-1 flex-col justify-center gap-6 p-6">
                  <div className="flex items-center gap-2">
                    <Lightning
                      className="text-primary"
                      size={15}
                      weight="fill"
                    />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick pick
                    </p>
                  </div>

                  {quickPicks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {quickPicks.map((pick) => (
                        <button
                          className="flex items-center justify-between border border-base-300 bg-base-100 px-4 py-3 text-left text-sm transition-all hover:border-primary/60 hover:bg-primary/5"
                          key={pick.date}
                          onClick={() => handleDateClick(pick.date)}
                        >
                          <span className="font-semibold text-base-content">
                            {pick.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pick.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-px flex-1 bg-base-300" />
                    <span className="text-xs">or pick from calendar</span>
                    <div className="h-px flex-1 bg-base-300" />
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <CalendarBlank size={15} />
                    <span className="text-xs">
                      Select any highlighted date on the calendar
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Form panel ── */}
          {step === "form" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin]">
                <button
                  className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-base-content"
                  onClick={() => {
                    setStep("calendar");
                    setSubmitError(null);
                  }}
                >
                  <ArrowLeft size={13} />
                  Back to times
                </button>

                <h3 className="mb-1 text-[15px] font-bold text-base-content">
                  Your details
                </h3>
                <p className="mb-5 text-xs text-muted-foreground">
                  Fill in your info to confirm the booking.
                </p>

                <form
                  className="flex max-w-sm flex-col gap-4"
                  onSubmit={handleSubmit}
                >
                  <FormField label="Name" required>
                    <input
                      className={`${inputCls} h-9`}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      type="text"
                      value={name}
                    />
                  </FormField>

                  <FormField label="Email" required>
                    <div className="relative">
                      <input
                        className={`${inputCls} h-9 ${emailBlocked ? "border-error focus:border-error focus:ring-error/15 pr-8" : ""}`}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setPrefilled(false);
                          setEmailBlocked(false);
                          if (submitError === "__blocked__") {
                            setSubmitError(null);
                          }
                        }}
                        placeholder="you@example.com"
                        required
                        type="email"
                        value={email}
                      />
                      {checkingBlocked && (
                        <Spinner
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                          size={13}
                        />
                      )}
                      {!checkingBlocked && emailBlocked && (
                        <button
                          aria-label="Clear email"
                          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-error transition-colors hover:text-error/70"
                          onClick={() => {
                            setEmail("");
                            setEmailBlocked(false);
                            setPrefilled(false);
                            if (submitError === "__blocked__") {
                              setSubmitError(null);
                            }
                          }}
                          type="button"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {emailBlocked && (
                      <div className="mt-2 border border-error/30 bg-error/5 px-4 py-3">
                        <p className="text-sm font-bold text-error">
                          Booking Unavailable
                        </p>
                        <p className="mt-1 text-sm text-error">
                          You have been blocked from booking with this host.
                        </p>
                        <p className="mt-0.5 text-xs text-error/70">
                          Please contact the host if you believe this is an
                          error.
                        </p>
                      </div>
                    )}
                    {!emailBlocked && prefilled && (
                      <p className="mt-1 text-sm text-primary font-medium">
                        Welcome back! We filled in your details from a previous
                        booking.
                      </p>
                    )}
                  </FormField>

                  {(() => {
                    const phoneQ = eventType.questions.find(
                      (q) => q.type === "phone"
                    );
                    const phoneRequired =
                      needsPhone || (phoneQ?.isRequired ?? false);
                    return needsPhone || phoneQ ? (
                      <FormField label="Phone" required={phoneRequired}>
                        {(() => {
                          const dialCode = dialCodeFromTz(inviteeTz);
                          return (
                            <>
                              <div
                                className={cn(
                                  "flex items-stretch border transition-all h-9",
                                  phoneError
                                    ? "border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error/40"
                                    : "border-input focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                                )}
                              >
                                <div className="flex shrink-0 items-center border-r border-input bg-base-200 px-2.5 text-sm font-mono font-semibold text-base-content min-w-[48px] justify-center select-none">
                                  {dialCode || "+"}
                                </div>
                                <input
                                  className="flex-1 bg-base-100 px-3 text-sm font-mono text-base-content placeholder:text-muted-foreground/50 outline-none"
                                  inputMode="tel"
                                  maxLength={20}
                                  onBlur={(e) => {
                                    const d = e.target.value.replace(/\D/g, "");
                                    setPhoneError(
                                      d.length === 0
                                        ? null
                                        : d.length < 7
                                          ? "Phone number is too short (min 7 digits)."
                                          : d.length > 15
                                            ? "Phone number is too long (max 15 digits)."
                                            : null
                                    );
                                  }}
                                  onChange={(e) => {
                                    let v = e.target.value;
                                    // Strip invalid chars — only digits, +, space, -, (, ), .
                                    v = v.replace(/[^\d+\s\-().]/g, "");
                                    if (v.indexOf("+") > 0) {
                                      v = "+" + v.replace(/\+/g, "");
                                    }
                                    setPhone(v);
                                    const d = v.replace(/\D/g, "");
                                    setPhoneError(
                                      d.length > 15
                                        ? "Phone number is too long (max 15 digits)."
                                        : null
                                    );
                                  }}
                                  placeholder={
                                    dialCode
                                      ? `${dialCode} XXXXX XXXXX`
                                      : "+91 98765 43210"
                                  }
                                  required={phoneRequired}
                                  type="tel"
                                  value={phone}
                                />
                              </div>
                              {phoneError && (
                                <p className="mt-1 text-xs text-error">
                                  {phoneError}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </FormField>
                    ) : null;
                  })()}

                  {eventType.questions
                    .filter((q) => q.type !== "phone")
                    .map((q) => (
                      <FormField
                        key={q.id}
                        label={q.label}
                        required={q.isRequired}
                      >
                        <QuestionInput
                          answers={answers}
                          q={q}
                          setAnswers={setAnswers}
                        />
                      </FormField>
                    ))}

                  {submitError && (
                    <div className="border border-error/30 bg-error/5 px-4 py-3">
                      {submitError === "__blocked__" ? (
                        <>
                          <p className="text-sm font-bold text-error">
                            Booking Unavailable
                          </p>
                          <p className="mt-1 text-sm text-error">
                            You have been blocked from booking with this host.
                          </p>
                          <p className="mt-0.5 text-xs text-error/70">
                            Please contact the host if you believe this is an
                            error.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-error">
                          {submitError}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    className={`mt-1 flex h-11 w-full items-center justify-center gap-2 text-sm font-bold text-white transition-all ${
                      submitError === "__blocked__" || emailBlocked
                        ? "bg-muted-foreground/40 cursor-not-allowed pointer-events-none"
                        : "bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}
                    disabled={
                      submitting ||
                      submitError === "__blocked__" ||
                      emailBlocked
                    }
                    type="submit"
                  >
                    {submitting ? (
                      <>
                        <Spinner className="animate-spin" size={15} />
                        Scheduling…
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── "Powered by <product>" footer ── */}
        {showPoweredBy && (
          <a
            aria-label={`Powered by ${PRODUCT_NAME}`}
            className="flex shrink-0 items-center justify-center gap-1.5 border-t border-base-300 bg-base-200/30 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            href="/"
          >
            Powered by{" "}
            <span className="font-bold text-primary">{PRODUCT_NAME}</span>
          </a>
        )}
      </div>
    </div>
  );
}
