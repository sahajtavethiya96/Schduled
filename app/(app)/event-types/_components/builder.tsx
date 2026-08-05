"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  FloppyDisk,
  List,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  createEventType,
  type EventTypeFormData,
  updateEventType,
} from "@/app/actions/event-types";
import type { MeetingLimitRow } from "@/app/actions/availability";
import type { MeetingIntegrations } from "@/lib/integrations/status";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { LivePreview } from "./live-preview";
import { TabAvailability } from "./tab-availability";
import { TabCancellation } from "./tab-cancellation";
import { TabGeneral, MEETING_TYPES } from "./tab-general";
import { TabLocation } from "./tab-location";
import { TabNotifications } from "./tab-notifications";
import { TabQuestions } from "./tab-questions";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isActive: z.boolean(),
  isHidden: z.boolean(),
  durations: z
    .array(z.number().min(5).max(480))
    .min(1, "At least one duration required"),
  defaultDuration: z.number(),
  availabilityScheduleId: z.string().optional(),
  bookingWindow: z.number().min(1).max(365),
  bookingWindowType: z.enum(["rolling", "fixed"]),
  bookingRangeStart: z.string().optional(),
  bookingRangeEnd: z.string().optional(),
  minimumNotice: z.number().min(0).max(1440),
  bufferBefore: z.number().min(0).max(120),
  bufferAfter: z.number().min(0).max(120),
  maxBookingsPerDay: z.number().min(1).max(100).nullable().optional(),
  startTimeIncrement: z.number().min(5).max(60),
  locationType: z.enum([
    "zoom",
    "google_meet",
    "phone_host_calls",
    "phone_invitee_calls",
    "in_person",
    "custom",
    "invitees_choice",
  ]),
  locationValue: z.string().max(500).optional(),
  hostPhoneNumber: z
    .string()
    .max(25)
    .refine(
      (v) => !v || v.trim() === '' || /^\+[1-9][\d\s\-().]*$/.test(v.trim()),
      { message: 'Enter a valid number with country code (e.g. +91 98765 43210)' }
    )
    .refine(
      (v) => {
        if (!v || v.trim() === '') return true
        // Digits after the dial code's leading "+" — bounds the local
        // number to a plausible length (4–15 digits, per E.164).
        const digits = v.trim().replace(/\D/g, '')
        return digits.length >= 5 && digits.length <= 18
      },
      { message: 'Phone number must be between 4 and 15 digits (plus country code)' }
    )
    .optional(),
  confirmationNote: z.string().max(1000).optional(),
  meetingType: z.enum(['one_on_one', 'group', 'round_robin', 'collective']),
  requiresApproval: z.boolean(),
  allowCancellation: z.boolean(),
  cancellationCutoffHours: z.number().min(0).max(72),
  allowRescheduling: z.boolean(),
  rescheduleCutoffHours: z.number().min(0).max(72),
  requireCancellationReason: z.boolean(),
  showPolicyText: z.boolean(),
  policyText: z.string().max(1000).optional(),
}).refine((v) => v.durations.includes(v.defaultDuration), {
  message: "The default duration must be one of the offered durations",
  path: ["defaultDuration"],
}).refine(
  (v) => v.locationType !== "in_person" || !!v.locationValue?.trim(),
  { message: "Enter a location address for in-person meetings", path: ["locationValue"] }
).refine(
  (v) => v.locationType !== "custom" || !!v.locationValue?.trim(),
  { message: "Enter a custom location or link", path: ["locationValue"] }
).refine(
  (v) => v.locationType !== "phone_invitee_calls" || !!v.hostPhoneNumber?.trim(),
  { message: "Enter your phone number for invitees to call", path: ["hostPhoneNumber"] }
).refine(
  (v) =>
    v.bookingWindowType !== "fixed" ||
    (!!v.bookingRangeStart && !!v.bookingRangeEnd),
  {
    message: "Set both a start and end date for a fixed booking window",
    path: ["bookingRangeEnd"],
  }
).refine(
  (v) =>
    v.bookingWindowType !== "fixed" ||
    !v.bookingRangeStart ||
    !v.bookingRangeEnd ||
    v.bookingRangeEnd >= v.bookingRangeStart,
  { message: "End date must be on or after the start date", path: ["bookingRangeEnd"] }
);

export type BuilderFormValues = z.infer<typeof schema>;

export interface ScheduleOption {
  id: string;
  isDefault: boolean;
  name: string;
  summary: { days: string; time: string } | null;
}

export interface ExistingQuestion {
  id: string;
  isActive: boolean;
  isRequired: boolean;
  label: string;
  options: string[] | null;
  placeholder: string | null;
  position: number;
  type: "short_text" | "long_text" | "phone" | "single_select" | "multiple_select" | "dropdown";
}

interface BuilderProps {
  defaultValues: BuilderFormValues;
  eventTypeId?: string;
  globalLimits?: MeetingLimitRow[];
  integrations?: MeetingIntegrations;
  mode: "create" | "edit";
  questions?: ExistingQuestion[];
  schedules: ScheduleOption[];
  username: string | null;
}

const TABS = [
  { id: "general", label: "Details" },
  { id: "availability", label: "Scheduling" },
  { id: "location", label: "Location" },
  { id: "questions", label: "Booking Form" },
  { id: "notifications", label: "Confirmations" },
  { id: "cancellation", label: "Cancellation" },
];

// Scoped to sessionStorage (this browser tab only, cleared when it closes)
// rather than localStorage — this is a scratch draft for an interrupted
// editing session (e.g. clicking "Edit Schedule" and coming back via the
// browser Back button), not something that should resurrect across
// unrelated future visits.
function draftKeyFor(mode: "create" | "edit", eventTypeId?: string) {
  return mode === "create"
    ? "schduled:event-type-draft:new"
    : `schduled:event-type-draft:edit:${eventTypeId}`;
}

// Maps each tab to the form fields it owns — used to jump to the tab with errors
const TAB_FIELDS: Record<string, (keyof BuilderFormValues)[]> = {
  general: ["name", "slug", "description", "color", "meetingType", "isActive", "isHidden", "requiresApproval"],
  availability: [
    "durations",
    "defaultDuration",
    "availabilityScheduleId",
    "bookingWindow",
    "bookingWindowType",
    "bookingRangeStart",
    "bookingRangeEnd",
    "minimumNotice",
    "bufferBefore",
    "bufferAfter",
    "startTimeIncrement",
    "maxBookingsPerDay",
  ],
  location: ["locationType", "locationValue", "hostPhoneNumber"],
  notifications: ["confirmationNote"],
  cancellation: [
    "allowCancellation",
    "cancellationCutoffHours",
    "allowRescheduling",
    "rescheduleCutoffHours",
    "requireCancellationReason",
    "showPolicyText",
    "policyText",
  ],
};

export function EventTypeBuilder({
  mode,
  eventTypeId,
  defaultValues,
  schedules,
  globalLimits = [],
  integrations = { googleConnected: false, zoomConnected: false },
  questions = [],
  username,
}: BuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("general");
  const [pendingQuestions, setPendingQuestions] = useState<ExistingQuestion[]>(
    []
  );
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    slug: string;
    name: string;
    isCreate: boolean;
  } | null>(null);

  const form = useForm<BuilderFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Track the last-saved values so "Discard" reverts to the most recent save
  // in edit mode, not the values the page was originally rendered with.
  const savedValuesRef = useRef(defaultValues);

  const draftKey = draftKeyFor(mode, eventTypeId);
  // Gates the persist-effect below until the restore-effect has had its
  // chance to run first. Both effects fire in the same commit on mount;
  // without this gate, the persist-effect's first run would capture
  // `watchedValues` from BEFORE the restore's form.reset() takes effect and
  // overwrite the just-read draft with the pre-restore (blank) values.
  const [hydrated, setHydrated] = useState(false);

  function clearDraft() {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Private-browsing/storage-disabled edge cases — nothing to clean up.
    }
  }

  // Restore an interrupted draft on mount — e.g. the user clicked "Edit
  // Schedule" (which navigates away to /availability) and came back via the
  // browser Back button. keepDefaultValues so formState.isDirty still
  // compares against the ORIGINAL server values, not the restored draft —
  // otherwise the Save/Discard buttons in edit mode wouldn't realize there's
  // anything to save.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      const parsed = raw ? JSON.parse(raw) : null;
      // Deliberately NOT validated against the full schema here — a draft is
      // often mid-edit and legitimately incomplete (e.g. required-field or
      // cross-field rules not satisfied yet). form.reset() doesn't require
      // validity; the existing per-tab/submit validation UX handles
      // incompleteness normally once the user acts on it.
      if (parsed?.values && typeof parsed.values === "object" && !Array.isArray(parsed.values)) {
        form.reset(parsed.values, { keepDefaultValues: true });
        if (typeof parsed.activeTab === "string") setActiveTab(parsed.activeTab);
        if (Array.isArray(parsed.pendingQuestions)) setPendingQuestions(parsed.pendingQuestions);
      }
    } catch {
      // Corrupted/incompatible draft — ignore it and start fresh.
    } finally {
      setHydrated(true);
    }
    // Intentionally mount-only: restoring is a one-time action, not something
    // that should re-run as the form/draftKey identity happens to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedValues = form.watch();

  // Persist the in-progress draft on every change so it survives the
  // navigate-away-and-come-back flow above. Gated on `hydrated` — see above.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ values: watchedValues, activeTab, pendingQuestions })
      );
    } catch {
      // Same as above — losing the draft-persistence nicety isn't worth
      // crashing the form over.
    }
  }, [hydrated, watchedValues, activeTab, pendingQuestions, draftKey]);

  const isDirty = form.formState.isDirty;
  const tabIndex = TABS.findIndex((t) => t.id === activeTab);

  // Warn before closing/refreshing when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  const isFirst = tabIndex === 0;
  const isLast = tabIndex === TABS.length - 1;

  // When validation fails, jump to the first tab that owns an errored field
  function onInvalid(errors: FieldErrors<BuilderFormValues>) {
    for (const tab of TABS) {
      if ((TAB_FIELDS[tab.id] ?? []).some((f) => f in errors)) {
        setActiveTab(tab.id);
        return;
      }
    }
  }

  function onSubmit(values: BuilderFormValues) {
    startTransition(async () => {
      const data: EventTypeFormData = {
        ...values,
        description: values.description || undefined,
        locationValue: values.locationValue || undefined,
        hostPhoneNumber: values.hostPhoneNumber || undefined,
        confirmationNote: values.confirmationNote || undefined,
        policyText: values.policyText || undefined,
        availabilityScheduleId: values.availabilityScheduleId || undefined,
        maxBookingsPerDay: values.maxBookingsPerDay ?? null,
      };

      if (mode === "create") {
        const res = await createEventType(
          data,
          pendingQuestions.map((q) => ({
            label: q.label,
            type: q.type,
            isRequired: q.isRequired,
            options: q.options ?? undefined,
            placeholder: q.placeholder ?? undefined,
          }))
        );
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        clearDraft();
        setSuccessInfo({
          id: res.id,
          slug: res.slug,
          name: values.name,
          isCreate: true,
        });
      } else {
        const res = await updateEventType(eventTypeId!, data);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        // The server may have auto-suffixed the slug on collision — sync the
        // form + preview link to the slug that was actually saved.
        const savedValues = { ...values, slug: res.slug };
        form.reset(savedValues);
        savedValuesRef.current = savedValues;
        clearDraft();
        setSuccessInfo({
          id: eventTypeId!,
          slug: res.slug,
          name: values.name,
          isCreate: false,
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        {/* Header + tab bar stick together as one unit while the form scrolls */}
        <div className="sticky top-0 z-20 bg-page">
          <div className="border border-border bg-background">
            {/* Breadcrumb row */}
            <Breadcrumb className="border-b border-border/60 px-4 py-1.5 text-xs">
              <BreadcrumbList className="gap-1.5 font-sans text-xs font-normal normal-case tracking-normal sm:gap-1.5">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link className="flex items-center gap-1" href="/event-types">
                      <ArrowLeft size={13} />
                      Meeting Types
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate">
                    {mode === "create"
                      ? "New Meeting Type"
                      : form.watch("name") || "Edit"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
  
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              {/* Initials avatar */}
              <span
                aria-hidden
                className="h-9 w-9 shrink-0 flex items-center justify-center text-white font-bold text-base ring-2 ring-inset ring-black/10"
                style={{ backgroundColor: form.watch("color") || "#0d9488" }}
              >
                {(form.watch("name") || (mode === "create" ? "N" : "E"))[0].toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="truncate text-lg font-bold text-foreground">
                    {form.watch("name") ||
                      (mode === "create" ? "New Meeting Type" : "Untitled")}
                  </h1>
                </div>
                {/* Event type badge */}
                <span className="mt-1 inline-block text-xs font-medium text-muted-foreground">
                  {MEETING_TYPES.find((m) => m.id === form.watch('meetingType'))?.label ?? "One-on-One"}
                </span>
              </div>
  
              {/* Save / Discard always visible in header */}
              <div className="flex shrink-0 items-center gap-2">
                {mode === "edit" && (
                  <Button
                    className="gap-1.5 text-muted-foreground"
                    disabled={!isDirty || isPending}
                    onClick={() => { form.reset(savedValuesRef.current); clearDraft(); }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <X size={13} />
                    Discard
                  </Button>
                )}
                <Button
                  className="gap-1.5"
                  disabled={(mode === "edit" && !isDirty) || isPending}
                  size="sm"
                  type="submit"
                >
                  <FloppyDisk size={13} />
                  {isPending
                    ? mode === "create" ? "Creating…" : "Saving…"
                    : mode === "create" ? "Create Meeting Type" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
  
          {/* Tab bar — custom, avoids scroll arrows. Aligns to the
              header card above (no edge-to-edge bleed) so the borders line up. */}
          <div className="border-b border-border bg-page">
            <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((tab) => (
                <button
                  className={cn(
                    "shrink-0 flex-1 min-w-[80px] border-b-2 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors",
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content — two-column layout on all tabs */}
        <div className="mt-6 flex gap-10 items-start">
          {/* Left: form content */}
          <div className="flex-1 min-w-0 max-w-3xl">
            {activeTab === "general" && (
              <TabGeneral
                form={form}
                meetingType={form.watch('meetingType')}
                onMeetingTypeChange={(t) => form.setValue('meetingType', t as BuilderFormValues['meetingType'], { shouldDirty: true })}
              />
            )}
            {activeTab === "availability" && (
              <TabAvailability form={form} schedules={schedules} globalLimits={globalLimits} />
            )}
            {activeTab === "location" && <TabLocation form={form} integrations={integrations} />}
            {activeTab === "questions" && (
              <TabQuestions
                eventTypeId={eventTypeId}
                mode={mode}
                locationType={form.watch("locationType")}
                onPendingChange={setPendingQuestions}
                pendingQuestions={pendingQuestions}
                questions={questions}
              />
            )}
            {activeTab === "notifications" && <TabNotifications form={form} />}
            {activeTab === "cancellation" && <TabCancellation form={form} />}

            {/* Prev / Next — sticky three-column nav. Aligns to the form column
                (no edge-to-edge bleed) so its border lines up with the fields. */}
            <div className="mt-8 sticky bottom-0 py-3 border-t border-border bg-page flex items-center justify-between">
              <Button
                className="gap-1.5"
                disabled={isFirst}
                onClick={(e) => { e.preventDefault(); setActiveTab(TABS[tabIndex - 1].id); }}
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeft size={13} />
                {!isFirst ? TABS[tabIndex - 1].label : "Previous"}
              </Button>

              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
                {TABS[tabIndex].label}
              </span>

              {isLast ? (
                <Button
                  className="gap-1.5"
                  disabled={(mode === "edit" && !isDirty) || isPending}
                  size="sm"
                  type="submit"
                >
                  <FloppyDisk size={13} />
                  {isPending
                    ? mode === "create"
                      ? "Creating…"
                      : "Saving…"
                    : mode === "create"
                      ? "Create Meeting Type"
                      : "Save Changes"}
                </Button>
              ) : (
                <Button
                  className="gap-1.5"
                  onClick={async (e) => {
                    e.preventDefault();
                    const valid = await form.trigger(TAB_FIELDS[activeTab]);
                    if (valid) setActiveTab(TABS[tabIndex + 1].id);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {TABS[tabIndex + 1].label}
                  <ArrowRight size={13} />
                </Button>
              )}
            </div>
          </div>

          {/* Right: live preview — always visible on large screens */}
          <div className="w-80 shrink-0 hidden lg:block lg:sticky lg:top-44">
            <LivePreview form={form} meetingType={form.watch('meetingType')} username={username} />
          </div>
        </div>

      </form>

      {/* Post-save success dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            if (successInfo?.isCreate) {
              router.push(`/event-types/${successInfo.id}`);
            } else {
              setSuccessInfo(null);
            }
          }
        }}
        open={!!successInfo}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="sr-only">Meeting type saved</DialogTitle>
          <DialogDescription className="sr-only">
            Your meeting type has been saved successfully.
          </DialogDescription>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
              <CheckCircle size={28} weight="fill" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base">
                {successInfo?.isCreate
                  ? "Meeting type created!"
                  : "Changes saved!"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground truncate max-w-[260px]">
                {successInfo?.name}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {/* Preview booking page */}
            {username && (
              <a
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                href={`/${username}/${successInfo?.slug}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ArrowSquareOut size={14} />
                Preview booking page
              </a>
            )}

            {/* Go to event list */}
            <Link
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium border border-border hover:bg-muted transition-colors"
              href="/event-types"
            >
              <List size={14} />
              Go to event list
            </Link>

            {/* Continue editing (create mode only) */}
            {successInfo?.isCreate && (
              <button
                className="inline-flex items-center justify-center h-9 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  router.push(`/event-types/${successInfo.id}`);
                }}
                type="button"
              >
                Continue editing
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
