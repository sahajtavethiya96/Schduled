import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getMeetingLimits } from "@/app/actions/availability";
import {
  getEventType,
  listAvailabilitySchedules,
} from "@/app/actions/event-types";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getMeetingIntegrations } from "@/lib/integrations/status";
import type {
  BuilderFormValues,
  ExistingQuestion,
} from "../_components/builder";
import { EventTypeBuilder } from "../_components/builder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const et = await getEventType(id);
  return { title: et ? `Edit: ${et.name}` : "Meeting Type" };
}

export default async function EditEventTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const [et, [currentUser], schedules, globalLimits, integrations] =
    await Promise.all([
      getEventType(id),
      db
        .select({ username: user.username })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1),
      listAvailabilitySchedules(),
      getMeetingLimits(),
      getMeetingIntegrations(session.user.id),
    ]);

  if (!et) {
    notFound();
  }

  const durations = et.durations.map((d) => d.duration).sort((a, b) => a - b);
  const defaultDuration =
    et.durations.find((d) => d.isDefault)?.duration ?? durations[0] ?? 30;

  const defaultValues: BuilderFormValues = {
    name: et.name,
    slug: et.slug,
    description: et.description ?? "",
    color: et.color ?? "#0d9488",
    meetingType:
      (et.meetingType as BuilderFormValues["meetingType"]) ?? "one_on_one",
    isActive: et.isActive,
    isHidden: et.isHidden,
    durations,
    defaultDuration,
    availabilityScheduleId: et.availabilityScheduleId ?? undefined,
    bookingWindow: et.bookingWindow ?? 60,
    bookingWindowType:
      (et.bookingWindowType as "rolling" | "fixed") ?? "rolling",
    bookingRangeStart: et.bookingRangeStart ?? undefined,
    bookingRangeEnd: et.bookingRangeEnd ?? undefined,
    minimumNotice: et.minimumNotice ?? 60,
    bufferBefore: et.bufferBefore ?? 0,
    bufferAfter: et.bufferAfter ?? 0,
    maxBookingsPerDay: et.maxBookingsPerDay ?? null,
    startTimeIncrement: et.startTimeIncrement ?? 30,
    locationType: et.locationType as BuilderFormValues["locationType"],
    locationValue: et.locationValue ?? "",
    hostPhoneNumber: et.hostPhoneNumber ?? "",
    confirmationNote: et.confirmationNote ?? "",
    requiresApproval: et.requiresApproval,
    allowCancellation: et.cancellationPolicy?.allowCancellation ?? true,
    cancellationCutoffHours: et.cancellationPolicy?.cutoffHours ?? 0,
    allowRescheduling: et.cancellationPolicy?.allowRescheduling ?? true,
    rescheduleCutoffHours: et.cancellationPolicy?.rescheduleCutoffHours ?? 0,
    requireCancellationReason:
      et.cancellationPolicy?.requireCancellationReason ?? false,
    showPolicyText: et.cancellationPolicy?.showPolicyText ?? true,
    policyText: et.cancellationPolicy?.policyText ?? "",
  };

  const questions: ExistingQuestion[] = (et.questions ?? []).map((q) => ({
    id: q.id,
    label: q.label,
    type: q.type as ExistingQuestion["type"],
    isRequired: q.isRequired,
    options: q.options as string[] | null,
    placeholder: q.placeholder,
    position: q.position,
    isActive: q.isActive,
  }));

  return (
    <EventTypeBuilder
      defaultValues={defaultValues}
      eventTypeId={et.id}
      globalLimits={globalLimits}
      integrations={integrations}
      mode="edit"
      questions={questions}
      schedules={schedules}
      username={currentUser?.username ?? null}
    />
  );
}
