"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  availabilitySchedule,
  availabilityWindow,
  booking,
  cancellationPolicy,
  eventType,
  eventTypeDuration,
  eventTypeQuestion,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { pickDistinctEventColor } from "@/lib/event-colors";

const DUPLICATE_NAME = "DUPLICATE_NAME";

type ActionResult<T = object> = { error: string } | ({ ok: true } & T);

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "meeting"
  );
}

// Generates a 5-char alphanumeric suffix for unique slugs.
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

// Fallback: if the random suffix somehow collides, append -1, -2, ...
async function uniqueSlug(
  userId: string,
  base: string,
  excludeId?: string
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const rows = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(and(eq(eventType.userId, userId), eq(eventType.slug, slug)))
      .limit(1);
    const taken = rows.find((r) => r.id !== excludeId);
    if (!taken) {
      return slug;
    }
    n++;
    slug = `${base}-${n}`;
  }
}

// Server-side mirror of the client's cross-field location validation, since
// a direct action call could otherwise bypass the form's required-field UI.
function validateLocation(
  data: Pick<
    EventTypeFormData,
    "locationType" | "locationValue" | "hostPhoneNumber"
  >
): string | null {
  if (data.locationType === "in_person" && !data.locationValue?.trim()) {
    return "Enter a location address for in-person meetings";
  }
  if (data.locationType === "custom" && !data.locationValue?.trim()) {
    return "Enter a custom location or link";
  }
  if (
    data.locationType === "phone_invitee_calls" &&
    !data.hostPhoneNumber?.trim()
  ) {
    return "Enter your phone number for invitees to call";
  }
  return null;
}

export async function listEventTypes() {
  const session = await requireSession();
  const types = await db.query.eventType.findMany({
    where: eq(eventType.userId, session.user.id),
    with: { durations: true },
    orderBy: (et, { asc }) => [asc(et.position), asc(et.createdAt)],
  });
  return types;
}

export async function getEventType(id: string) {
  const session = await requireSession();
  const et = await db.query.eventType.findFirst({
    where: and(eq(eventType.id, id), eq(eventType.userId, session.user.id)),
    with: {
      durations: true,
      cancellationPolicy: true,
      questions: { orderBy: (q, { asc }) => [asc(q.position)] },
    },
  });
  return et ?? null;
}

export interface EventTypeFormData {
  allowCancellation: boolean;
  allowRescheduling: boolean;
  availabilityScheduleId?: string;
  bookingRangeEnd?: string | null;
  bookingRangeStart?: string | null;
  bookingWindow: number;
  bookingWindowType: "rolling" | "fixed";
  bufferAfter: number;
  bufferBefore: number;
  cancellationCutoffHours: number;
  color: string;
  confirmationNote?: string;
  defaultDuration: number;
  description?: string;
  durations: number[];
  hostPhoneNumber?: string;
  isActive: boolean;
  isHidden: boolean;
  locationType:
    | "zoom"
    | "google_meet"
    | "phone_host_calls"
    | "phone_invitee_calls"
    | "in_person"
    | "custom"
    | "invitees_choice";
  locationValue?: string;
  maxBookingsPerDay?: number | null;
  meetingType: "one_on_one" | "group" | "round_robin" | "collective";
  minimumNotice: number;
  name: string;
  policyText?: string;
  requireCancellationReason: boolean;
  requiresApproval: boolean;
  rescheduleCutoffHours: number;
  showPolicyText: boolean;
  slug: string;
  startTimeIncrement: number;
}

export async function createEventType(
  data: EventTypeFormData,
  initialQuestions?: QuestionData[]
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const session = await requireSession();

    const name = data.name.trim();
    if (!name) {
      return { error: "Event name is required" };
    }
    if (name.length > 100) {
      return { error: "Event name must be 100 characters or less" };
    }
    if (data.durations.length === 0) {
      return { error: "At least one duration is required" };
    }
    const locationError = validateLocation(data);
    if (locationError) {
      return { error: locationError };
    }

    // Slug = slugified name + random suffix, so same-named events still get
    // distinct URLs; uniqueSlug's loop is just a collision safety net.
    const slugBase = `${slugify(name)}-${randomSuffix()}`;
    const id = createId();

    const slug = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`et-slug:${session.user.id}`}))`
      );

      // Loaded under the per-user lock to enforce a unique name and pick an unused color.
      const existingRows = await tx
        .select({ name: eventType.name, color: eventType.color })
        .from(eventType)
        .where(eq(eventType.userId, session.user.id));

      if (
        existingRows.some(
          (r) => r.name.trim().toLowerCase() === name.toLowerCase()
        )
      ) {
        throw new Error(DUPLICATE_NAME);
      }

      const resolvedSlug = await uniqueSlug(session.user.id, slugBase);

      // Computed under the lock so concurrent creates still get distinct colors.
      const color = pickDistinctEventColor(
        existingRows.map((r) => r.color).filter((c): c is string => !!c),
        existingRows.length
      );

      await tx.insert(eventType).values({
        id,
        userId: session.user.id,
        name,
        slug: resolvedSlug,
        description: data.description?.trim() || null,
        color,
        meetingType: data.meetingType,
        isActive: data.isActive,
        isHidden: data.isHidden,
        availabilityScheduleId: data.availabilityScheduleId || null,
        bookingWindow: data.bookingWindow,
        bookingWindowType: data.bookingWindowType,
        bookingRangeStart:
          data.bookingWindowType === "fixed"
            ? data.bookingRangeStart || null
            : null,
        bookingRangeEnd:
          data.bookingWindowType === "fixed"
            ? data.bookingRangeEnd || null
            : null,
        minimumNotice: data.minimumNotice,
        bufferBefore: data.bufferBefore,
        bufferAfter: data.bufferAfter,
        maxBookingsPerDay: data.maxBookingsPerDay ?? null,
        startTimeIncrement: data.startTimeIncrement,
        locationType: data.locationType,
        locationValue: data.locationValue?.trim() || null,
        hostPhoneNumber: data.hostPhoneNumber?.trim() || null,
        confirmationNote: data.confirmationNote?.trim() || null,
        requiresApproval: data.requiresApproval,
        position: existingRows.length,
      });

      return resolvedSlug;
    });

    await db.insert(eventTypeDuration).values(
      data.durations.map((d) => ({
        eventTypeId: id,
        duration: d,
        isDefault: d === data.defaultDuration,
      }))
    );

    await db.insert(cancellationPolicy).values({
      eventTypeId: id,
      allowCancellation: data.allowCancellation,
      cutoffHours: data.cancellationCutoffHours,
      allowRescheduling: data.allowRescheduling,
      rescheduleCutoffHours: data.rescheduleCutoffHours,
      requireCancellationReason: data.requireCancellationReason,
      showPolicyText: data.showPolicyText,
      policyText: data.policyText?.trim() || null,
    });

    if (initialQuestions && initialQuestions.length > 0) {
      await db.insert(eventTypeQuestion).values(
        initialQuestions.map((q, i) => ({
          id: createId(),
          eventTypeId: id,
          label: q.label.trim(),
          type: q.type,
          isRequired: q.isRequired,
          options: q.options && q.options.length > 0 ? q.options : null,
          placeholder: q.placeholder?.trim() || null,
          position: i,
          isActive: true,
        }))
      );
    }

    await audit({
      action: "event_type.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "event_type",
      entityId: id,
      description: `Created event type "${name}"`,
      metadata: { slug, locationType: data.locationType },
    });

    revalidatePath("/event-types");
    return { ok: true, id, slug };
  } catch (err) {
    if (err instanceof Error && err.message === DUPLICATE_NAME) {
      return {
        error:
          "You already have a meeting type with this name. Please choose a different name.",
      };
    }
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateEventType(
  id: string,
  data: EventTypeFormData
): Promise<ActionResult<{ slug: string }>> {
  try {
    const session = await requireSession();

    const name = data.name.trim();
    if (!name) {
      return { error: "Event name is required" };
    }
    if (data.durations.length === 0) {
      return { error: "At least one duration is required" };
    }
    const locationError = validateLocation(data);
    if (locationError) {
      return { error: locationError };
    }

    // Slug never changes on update, so booking URLs stay permanent across renames.
    const [existing] = await db
      .select({ id: eventType.id, slug: eventType.slug })
      .from(eventType)
      .where(and(eq(eventType.id, id), eq(eventType.userId, session.user.id)))
      .limit(1);
    if (!existing) {
      return { error: "Event type not found" };
    }

    const [dup] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(
        and(
          eq(eventType.userId, session.user.id),
          ne(eventType.id, id),
          sql`lower(${eventType.name}) = lower(${name})`
        )
      )
      .limit(1);
    if (dup) {
      return {
        error:
          "You already have a meeting type with this name. Please choose a different name.",
      };
    }

    const slug = existing.slug;

    await db
      .update(eventType)
      .set({
        name,
        slug,
        description: data.description?.trim() || null,
        color: data.color,
        meetingType: data.meetingType,
        isActive: data.isActive,
        isHidden: data.isHidden,
        availabilityScheduleId: data.availabilityScheduleId || null,
        bookingWindow: data.bookingWindow,
        bookingWindowType: data.bookingWindowType,
        bookingRangeStart:
          data.bookingWindowType === "fixed"
            ? data.bookingRangeStart || null
            : null,
        bookingRangeEnd:
          data.bookingWindowType === "fixed"
            ? data.bookingRangeEnd || null
            : null,
        minimumNotice: data.minimumNotice,
        bufferBefore: data.bufferBefore,
        bufferAfter: data.bufferAfter,
        maxBookingsPerDay: data.maxBookingsPerDay ?? null,
        startTimeIncrement: data.startTimeIncrement,
        locationType: data.locationType,
        locationValue: data.locationValue?.trim() || null,
        hostPhoneNumber: data.hostPhoneNumber?.trim() || null,
        confirmationNote: data.confirmationNote?.trim() || null,
        requiresApproval: data.requiresApproval,
        updatedAt: new Date(),
      })
      .where(eq(eventType.id, id));

    await db
      .delete(eventTypeDuration)
      .where(eq(eventTypeDuration.eventTypeId, id));
    await db.insert(eventTypeDuration).values(
      data.durations.map((d) => ({
        eventTypeId: id,
        duration: d,
        isDefault: d === data.defaultDuration,
      }))
    );

    const [existingPolicy] = await db
      .select({ id: cancellationPolicy.id })
      .from(cancellationPolicy)
      .where(eq(cancellationPolicy.eventTypeId, id))
      .limit(1);

    const policyValues = {
      allowCancellation: data.allowCancellation,
      cutoffHours: data.cancellationCutoffHours,
      allowRescheduling: data.allowRescheduling,
      rescheduleCutoffHours: data.rescheduleCutoffHours,
      requireCancellationReason: data.requireCancellationReason,
      showPolicyText: data.showPolicyText,
      policyText: data.policyText?.trim() || null,
    };

    if (existingPolicy) {
      await db
        .update(cancellationPolicy)
        .set(policyValues)
        .where(eq(cancellationPolicy.id, existingPolicy.id));
    } else {
      await db
        .insert(cancellationPolicy)
        .values({ eventTypeId: id, ...policyValues });
    }

    await audit({
      action: "event_type.updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "event_type",
      entityId: id,
      description: `Updated event type "${name}"`,
    });

    revalidatePath("/event-types");
    revalidatePath(`/event-types/${id}`);
    return { ok: true, slug };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function toggleEventTypeActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select({ id: eventType.id, name: eventType.name })
      .from(eventType)
      .where(and(eq(eventType.id, id), eq(eventType.userId, session.user.id)))
      .limit(1);
    if (!existing) {
      return { error: "Event type not found" };
    }

    await db
      .update(eventType)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(eventType.id, id));

    await audit({
      action: isActive ? "event_type.activated" : "event_type.deactivated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "event_type",
      entityId: id,
      description: `${isActive ? "Activated" : "Deactivated"} event type "${existing.name}"`,
    });

    revalidatePath("/event-types");
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteEventType(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select({ id: eventType.id, name: eventType.name })
      .from(eventType)
      .where(and(eq(eventType.id, id), eq(eventType.userId, session.user.id)))
      .limit(1);
    if (!existing) {
      return { error: "Event type not found" };
    }

    // Deleting would cascade-delete bookings, stranding invitees with confirmed
    // future slots — block while upcoming bookings remain; hide instead.
    const upcoming = await db
      .select({ id: booking.id })
      .from(booking)
      .where(
        and(
          eq(booking.eventTypeId, id),
          gt(booking.startTime, new Date()),
          sql`${booking.status} IN ('confirmed', 'pending')`
        )
      );
    if (upcoming.length > 0) {
      return {
        error: `This meeting type has ${upcoming.length} upcoming booking${upcoming.length === 1 ? "" : "s"}. Cancel ${upcoming.length === 1 ? "it" : "them"} first, or hide the meeting type instead of deleting it.`,
      };
    }

    await db.transaction(async (tx) => {
      await tx.delete(booking).where(eq(booking.eventTypeId, id));
      await tx.delete(eventType).where(eq(eventType.id, id));
    });

    await audit({
      action: "event_type.deleted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "event_type",
      entityId: id,
      description: `Deleted event type "${existing.name}"`,
    });

    revalidatePath("/event-types");
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function bulkDeleteEventTypes(
  ids: string[]
): Promise<ActionResult> {
  if (!ids.length) {
    return { ok: true };
  }
  try {
    const session = await requireSession();

    // Same cascade-delete concern as deleteEventType, applied across the batch.
    const upcoming = await db
      .select({ id: booking.id })
      .from(booking)
      .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
      .where(
        and(
          inArray(booking.eventTypeId, ids),
          eq(eventType.userId, session.user.id),
          gt(booking.startTime, new Date()),
          sql`${booking.status} IN ('confirmed', 'pending')`
        )
      )
      .limit(1);
    if (upcoming.length > 0) {
      return {
        error:
          "One or more selected meeting types have upcoming bookings. Cancel those bookings first, or hide the meeting types instead of deleting them.",
      };
    }

    await db.transaction(async (tx) => {
      await tx.delete(booking).where(inArray(booking.eventTypeId, ids));
      await tx
        .delete(eventType)
        .where(
          and(inArray(eventType.id, ids), eq(eventType.userId, session.user.id))
        );
    });
    revalidatePath("/event-types");
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function bulkToggleEventTypes(
  ids: string[],
  isActive: boolean
): Promise<ActionResult> {
  if (!ids.length) {
    return { ok: true };
  }
  try {
    const session = await requireSession();
    await db
      .update(eventType)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(inArray(eventType.id, ids), eq(eventType.userId, session.user.id))
      );
    revalidatePath("/event-types");
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function duplicateEventType(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const source = await db.query.eventType.findFirst({
      where: and(eq(eventType.id, id), eq(eventType.userId, session.user.id)),
      with: { durations: true, cancellationPolicy: true, questions: true },
    });
    if (!source) {
      return { error: "Event type not found" };
    }

    const newId = createId();
    // Pull the relation arrays out so they aren't spread into the insert.
    const {
      durations,
      cancellationPolicy: sourcePolicy,
      questions,
      ...sourceCols
    } = source;

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`et-slug:${session.user.id}`}))`
      );
      const resolvedSlug = await uniqueSlug(
        session.user.id,
        `${source.slug}-${randomSuffix()}`
      );

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(eventType)
        .where(eq(eventType.userId, session.user.id));

      await tx.insert(eventType).values({
        ...sourceCols,
        id: newId,
        name: `${source.name} (copy)`,
        slug: resolvedSlug,
        isActive: false,
        position: count,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    if (durations.length > 0) {
      await db.insert(eventTypeDuration).values(
        durations.map((d) => ({
          eventTypeId: newId,
          duration: d.duration,
          isDefault: d.isDefault,
        }))
      );
    }

    if (sourcePolicy) {
      const {
        id: _pid,
        eventTypeId: _eid,
        createdAt: _ca,
        ...policyRest
      } = sourcePolicy;
      await db
        .insert(cancellationPolicy)
        .values({ eventTypeId: newId, ...policyRest });
    }

    if (questions.length > 0) {
      await db.insert(eventTypeQuestion).values(
        questions.map((q) => ({
          eventTypeId: newId,
          label: q.label,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options ?? null,
          placeholder: q.placeholder,
          position: q.position,
          isActive: q.isActive,
        }))
      );
    }

    revalidatePath("/event-types");
    return { ok: true, id: newId };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export interface QuestionData {
  isRequired: boolean;
  label: string;
  options?: string[];
  placeholder?: string;
  type:
    | "short_text"
    | "long_text"
    | "phone"
    | "single_select"
    | "multiple_select"
    | "dropdown";
}

export async function addQuestion(
  eventTypeId: string,
  data: QuestionData
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const [et] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(
        and(
          eq(eventType.id, eventTypeId),
          eq(eventType.userId, session.user.id)
        )
      )
      .limit(1);
    if (!et) {
      return { error: "Event type not found" };
    }

    const [{ maxPos }] = await db
      .select({ maxPos: sql<number>`coalesce(max(position), -1)::int` })
      .from(eventTypeQuestion)
      .where(eq(eventTypeQuestion.eventTypeId, eventTypeId));

    const id = createId();
    await db.insert(eventTypeQuestion).values({
      id,
      eventTypeId,
      label: data.label.trim(),
      type: data.type,
      isRequired: data.isRequired,
      options: data.options && data.options.length > 0 ? data.options : null,
      placeholder: data.placeholder?.trim() || null,
      position: maxPos + 1,
      isActive: true,
    });

    revalidatePath(`/event-types/${eventTypeId}`);
    return { ok: true, id };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateQuestion(
  id: string,
  data: QuestionData
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const question = await db.query.eventTypeQuestion.findFirst({
      where: eq(eventTypeQuestion.id, id),
      with: { eventType: { columns: { userId: true, id: true } } },
    });
    if (!question || question.eventType.userId !== session.user.id) {
      return { error: "Question not found" };
    }

    await db
      .update(eventTypeQuestion)
      .set({
        label: data.label.trim(),
        type: data.type,
        isRequired: data.isRequired,
        options: data.options && data.options.length > 0 ? data.options : null,
        placeholder: data.placeholder?.trim() || null,
      })
      .where(eq(eventTypeQuestion.id, id));

    revalidatePath(`/event-types/${question.eventType.id}`);
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const question = await db.query.eventTypeQuestion.findFirst({
      where: eq(eventTypeQuestion.id, id),
      with: { eventType: { columns: { userId: true, id: true } } },
    });
    if (!question || question.eventType.userId !== session.user.id) {
      return { error: "Question not found" };
    }

    await db.delete(eventTypeQuestion).where(eq(eventTypeQuestion.id, id));
    revalidatePath(`/event-types/${question.eventType.id}`);
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function reorderEventTypes(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await Promise.all(
      ids.map((id, pos) =>
        db
          .update(eventType)
          .set({ position: pos })
          .where(
            and(eq(eventType.id, id), eq(eventType.userId, session.user.id))
          )
      )
    );
    revalidatePath("/event-types");
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function reorderQuestions(
  eventTypeId: string,
  ids: string[]
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const [et] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(
        and(
          eq(eventType.id, eventTypeId),
          eq(eventType.userId, session.user.id)
        )
      )
      .limit(1);
    if (!et) {
      return { error: "Event type not found" };
    }

    await Promise.all(
      ids.map((qid, pos) =>
        db
          .update(eventTypeQuestion)
          .set({ position: pos })
          .where(
            and(
              eq(eventTypeQuestion.id, qid),
              eq(eventTypeQuestion.eventTypeId, eventTypeId)
            )
          )
      )
    );

    revalidatePath(`/event-types/${eventTypeId}`);
    return { ok: true };
  } catch (err) {
    console.error("[eventTypes]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type DayOfWeek = (typeof DAY_ORDER)[number];
const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0
    ? `${h12} ${ampm}`
    : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function listAvailabilitySchedules() {
  const session = await requireSession();
  const schedules = await db
    .select({
      id: availabilitySchedule.id,
      name: availabilitySchedule.name,
      isDefault: availabilitySchedule.isDefault,
    })
    .from(availabilitySchedule)
    .where(eq(availabilitySchedule.userId, session.user.id));

  if (schedules.length === 0) {
    return [];
  }

  const windows = await db
    .select({
      scheduleId: availabilityWindow.scheduleId,
      dayOfWeek: availabilityWindow.dayOfWeek,
      startTime: availabilityWindow.startTime,
      endTime: availabilityWindow.endTime,
    })
    .from(availabilityWindow)
    .where(
      inArray(
        availabilityWindow.scheduleId,
        schedules.map((s) => s.id)
      )
    );

  const bySchedule = new Map<string, typeof windows>();
  for (const w of windows) {
    const arr = bySchedule.get(w.scheduleId) ?? [];
    arr.push(w);
    bySchedule.set(w.scheduleId, arr);
  }

  return schedules.map((s) => {
    const wins = bySchedule.get(s.id) ?? [];
    const sortedDays = [...new Set(wins.map((w) => w.dayOfWeek))].sort(
      (a, b) =>
        DAY_ORDER.indexOf(a as DayOfWeek) - DAY_ORDER.indexOf(b as DayOfWeek)
    );
    const isMidF =
      sortedDays.length === 5 &&
      !sortedDays.includes("saturday") &&
      !sortedDays.includes("sunday");
    const isAll7 = sortedDays.length === 7;
    const daysStr =
      sortedDays.length === 0
        ? null
        : isMidF
          ? "Mon – Fri"
          : isAll7
            ? "Every day"
            : sortedDays.map((d) => DAY_SHORT[d] ?? d).join(", ");
    const first = wins[0];
    const timeStr = first
      ? `${fmt12(first.startTime)} – ${fmt12(first.endTime)}`
      : null;
    return {
      ...s,
      summary: daysStr && timeStr ? { days: daysStr, time: timeStr } : null,
    };
  });
}
