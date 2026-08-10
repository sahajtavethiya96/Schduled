"use server";

import { and, eq, gte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  availabilityOverride,
  availabilitySchedule,
  availabilityWindow,
  eventType,
  meetingLimit,
  user,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

type ActionResult<T = Record<never, never>> =
  | { error: string }
  | ({ ok: true } & T);

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type TimeSlot = { startTime: string; endTime: string };

export interface ScheduleData {
  id: string;
  isDefault: boolean;
  name: string;
  timezone: string;
  windows: Record<DayOfWeek, TimeSlot[]>;
}

const DAY_KEYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function emptyWindows(): Record<DayOfWeek, TimeSlot[]> {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

function windowsFromRows(
  rows: { dayOfWeek: string; startTime: string; endTime: string }[]
): Record<DayOfWeek, TimeSlot[]> {
  const windows = emptyWindows();
  for (const w of rows) {
    const day = w.dayOfWeek as DayOfWeek;
    if (DAY_KEYS.includes(day)) {
      windows[day].push({ startTime: w.startTime, endTime: w.endTime });
    }
  }
  return windows;
}

export interface OverrideData {
  date: string;
  isBlocked: boolean;
  reason: string | null;
  slots: TimeSlot[];
}

// ── Load ──────────────────────────────────────────────────────────────────────

export async function getAvailabilityData(): Promise<{
  schedules: ScheduleData[];
  overrides: OverrideData[];
  userTimezone: string;
}> {
  const session = await requireSession();

  const [freshUser] = await db
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const userTimezone = freshUser?.timezone ?? "UTC";

  // All schedules for this user, default first then by creation order.
  const scheduleRows = await db.query.availabilitySchedule.findMany({
    where: eq(availabilitySchedule.userId, session.user.id),
    with: { windows: true },
  });

  const schedules: ScheduleData[] = scheduleRows
    .map((s) => ({
      id: s.id,
      name: s.name,
      timezone: s.timezone,
      isDefault: s.isDefault,
      windows: windowsFromRows(s.windows),
    }))
    .sort((a, b) =>
      a.isDefault === b.isDefault
        ? a.name.localeCompare(b.name)
        : a.isDefault
          ? -1
          : 1
    );

  // Today in YYYY-MM-DD so we only return future overrides
  const today = new Date().toISOString().slice(0, 10);

  const overrideRows = await db
    .select()
    .from(availabilityOverride)
    .where(
      and(
        eq(availabilityOverride.userId, session.user.id),
        gte(availabilityOverride.date, today)
      )
    )
    .orderBy(availabilityOverride.date);

  // Group override rows by date — multiple rows per date = multiple slots
  const overrideMap = new Map<string, OverrideData>();
  for (const o of overrideRows) {
    if (o.isBlocked) {
      overrideMap.set(o.date, {
        date: o.date,
        isBlocked: true,
        slots: [],
        reason: o.reason ?? null,
      });
    } else {
      const existing = overrideMap.get(o.date);
      const slot = { startTime: o.startTime!, endTime: o.endTime! };
      if (existing) {
        existing.slots.push(slot);
      } else {
        overrideMap.set(o.date, {
          date: o.date,
          isBlocked: false,
          slots: [slot],
          reason: o.reason ?? null,
        });
      }
    }
  }

  return {
    schedules,
    overrides: Array.from(overrideMap.values()),
    userTimezone,
  };
}

// ── Update schedule windows ───────────────────────────────────────────────────

export async function updateAvailabilitySchedule(
  scheduleId: string,
  name: string,
  windows: Record<DayOfWeek, TimeSlot[]>
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [existing] = await db
      .select({ id: availabilitySchedule.id })
      .from(availabilitySchedule)
      .where(
        and(
          eq(availabilitySchedule.id, scheduleId),
          eq(availabilitySchedule.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return { error: "Schedule not found" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(availabilitySchedule)
        .set({ name: name.trim() || "Working Hours" })
        .where(eq(availabilitySchedule.id, scheduleId));

      await tx
        .delete(availabilityWindow)
        .where(eq(availabilityWindow.scheduleId, scheduleId));

      const rows = (
        Object.entries(windows) as [DayOfWeek, TimeSlot[]][]
      ).flatMap(([day, slots]) =>
        slots.map((s) => ({
          scheduleId,
          dayOfWeek: day,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );

      if (rows.length > 0) {
        await tx.insert(availabilityWindow).values(rows);
      }
    });

    await audit({
      action: "availability.schedule_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Updated availability schedule "${name}"`,
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Create default schedule (if none exists) ──────────────────────────────────

export async function createDefaultSchedule(): Promise<
  ActionResult<{ id: string }>
> {
  try {
    const session = await requireSession();

    const [freshUser] = await db
      .select({ timezone: user.timezone })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const timezone = freshUser?.timezone ?? "UTC";

    const [schedule] = await db
      .insert(availabilitySchedule)
      .values({
        userId: session.user.id,
        name: "Working Hours",
        isDefault: true,
        timezone,
      })
      .returning();

    const defaultSlots = (
      ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[]
    ).map((day) => ({
      scheduleId: schedule.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
    }));

    await db.insert(availabilityWindow).values(defaultSlots);

    revalidatePath("/availability");
    return { ok: true, id: schedule.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Create a NEW (non-default) schedule ───────────────────────────────────────

export async function createSchedule(
  name: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const trimmed = name.trim() || "New schedule";

    // Inherit timezone from the user's existing default schedule (or user tz).
    const [defaultSchedule] = await db
      .select({ timezone: availabilitySchedule.timezone })
      .from(availabilitySchedule)
      .where(
        and(
          eq(availabilitySchedule.userId, session.user.id),
          eq(availabilitySchedule.isDefault, true)
        )
      )
      .limit(1);

    const [freshUser] = await db
      .select({ timezone: user.timezone })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const timezone = defaultSchedule?.timezone ?? freshUser?.timezone ?? "UTC";

    // If the user somehow has no schedules yet, the first one becomes default.
    const existingIds = await db
      .select({ id: availabilitySchedule.id })
      .from(availabilitySchedule)
      .where(eq(availabilitySchedule.userId, session.user.id));
    const isFirst = existingIds.length === 0;

    const [schedule] = await db
      .insert(availabilitySchedule)
      .values({
        userId: session.user.id,
        name: trimmed,
        isDefault: isFirst,
        timezone,
      })
      .returning();

    // Seed with Mon–Fri 9–5 so it's immediately usable.
    const defaultSlots = (
      ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[]
    ).map((day) => ({
      scheduleId: schedule.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
    }));
    await db.insert(availabilityWindow).values(defaultSlots);

    await audit({
      action: "availability.schedule_created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Created availability schedule "${trimmed}"`,
    });

    revalidatePath("/availability");
    return { ok: true, id: schedule.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Duplicate a schedule (with its weekly windows) ────────────────────────────

export async function duplicateSchedule(
  scheduleId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();

    const source = await db.query.availabilitySchedule.findFirst({
      where: and(
        eq(availabilitySchedule.id, scheduleId),
        eq(availabilitySchedule.userId, session.user.id)
      ),
      with: { windows: true },
    });
    if (!source) {
      return { error: "Schedule not found" };
    }

    const [copy] = await db
      .insert(availabilitySchedule)
      .values({
        userId: session.user.id,
        name: `${source.name} (copy)`,
        isDefault: false,
        timezone: source.timezone,
      })
      .returning();

    if (source.windows.length > 0) {
      await db.insert(availabilityWindow).values(
        source.windows.map((w) => ({
          scheduleId: copy.id,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        }))
      );
    }

    revalidatePath("/availability");
    return { ok: true, id: copy.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Rename a schedule ─────────────────────────────────────────────────────────

export async function renameSchedule(
  scheduleId: string,
  name: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const trimmed = name.trim();
    if (!trimmed) {
      return { error: "Name is required" };
    }

    const result = await db
      .update(availabilitySchedule)
      .set({ name: trimmed })
      .where(
        and(
          eq(availabilitySchedule.id, scheduleId),
          eq(availabilitySchedule.userId, session.user.id)
        )
      )
      .returning({ id: availabilitySchedule.id });

    if (result.length === 0) {
      return { error: "Schedule not found" };
    }

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Set a schedule as the default ─────────────────────────────────────────────

export async function setDefaultSchedule(
  scheduleId: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [target] = await db
      .select({ id: availabilitySchedule.id })
      .from(availabilitySchedule)
      .where(
        and(
          eq(availabilitySchedule.id, scheduleId),
          eq(availabilitySchedule.userId, session.user.id)
        )
      )
      .limit(1);
    if (!target) {
      return { error: "Schedule not found" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(availabilitySchedule)
        .set({ isDefault: false })
        .where(
          and(
            eq(availabilitySchedule.userId, session.user.id),
            ne(availabilitySchedule.id, scheduleId)
          )
        );
      await tx
        .update(availabilitySchedule)
        .set({ isDefault: true })
        .where(eq(availabilitySchedule.id, scheduleId));
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Delete a schedule ─────────────────────────────────────────────────────────

export async function deleteSchedule(
  scheduleId: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const all = await db
      .select({
        id: availabilitySchedule.id,
        name: availabilitySchedule.name,
        isDefault: availabilitySchedule.isDefault,
      })
      .from(availabilitySchedule)
      .where(eq(availabilitySchedule.userId, session.user.id));

    const target = all.find((s) => s.id === scheduleId);
    if (!target) {
      return { error: "Schedule not found" };
    }
    if (all.length <= 1) {
      return { error: "You must keep at least one schedule." };
    }

    await db.transaction(async (tx) => {
      // Event types pinned to this schedule fall back to the default (null).
      await tx
        .update(eventType)
        .set({ availabilityScheduleId: null })
        .where(
          and(
            eq(eventType.userId, session.user.id),
            eq(eventType.availabilityScheduleId, scheduleId)
          )
        );

      await tx
        .delete(availabilitySchedule)
        .where(eq(availabilitySchedule.id, scheduleId));

      // If we removed the default, promote another schedule. Pick the
      // alphabetically-first remaining one so the server's choice matches the
      // client's optimistic promotion (which sorts by name).
      if (target.isDefault) {
        const next = all
          .filter((s) => s.id !== scheduleId)
          .sort((a, b) => a.name.localeCompare(b.name))[0];
        if (next) {
          await tx
            .update(availabilitySchedule)
            .set({ isDefault: true })
            .where(eq(availabilitySchedule.id, next.id));
        }
      }
    });

    await audit({
      action: "availability.schedule_deleted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: "Deleted an availability schedule",
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Date overrides ────────────────────────────────────────────────────────────

export async function addAvailabilityOverride(data: {
  date: string;
  isBlocked: boolean;
  slots?: TimeSlot[];
  reason?: string;
}): Promise<ActionResult> {
  try {
    const session = await requireSession();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return { error: "Invalid date format" };
    }

    // Delete all existing rows for this date
    await db
      .delete(availabilityOverride)
      .where(
        and(
          eq(availabilityOverride.userId, session.user.id),
          eq(availabilityOverride.date, data.date)
        )
      );

    const slots = data.isBlocked
      ? []
      : (data.slots ?? [{ startTime: "09:00", endTime: "17:00" }]);

    if (data.isBlocked) {
      // Insert a single blocked row
      await db.insert(availabilityOverride).values({
        userId: session.user.id,
        date: data.date,
        isBlocked: true,
        startTime: null,
        endTime: null,
        reason: data.reason?.trim() || null,
      });
    } else {
      // Insert one row per slot
      await db.insert(availabilityOverride).values(
        slots.map((s) => ({
          userId: session.user.id,
          date: data.date,
          isBlocked: false,
          startTime: s.startTime,
          endTime: s.endTime,
          reason: data.reason?.trim() || null,
        }))
      );
    }

    await audit({
      action: "availability.override_added",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Added availability override for ${data.date} (${data.isBlocked ? "blocked" : `${slots.length} slot(s)`})`,
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateUserTimezone(
  timezone: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    // Validate timezone string
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return { error: "Invalid timezone" };
    }

    await db
      .update(user)
      .set({ timezone, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    // Also update the default schedule timezone to stay in sync
    await db
      .update(availabilitySchedule)
      .set({ timezone })
      .where(
        and(
          eq(availabilitySchedule.userId, session.user.id),
          eq(availabilitySchedule.isDefault, true)
        )
      );

    await audit({
      action: "user.timezone_changed",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Changed timezone to ${timezone}`,
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteAvailabilityOverride(
  date: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Invalid date format" };
    }

    await db
      .delete(availabilityOverride)
      .where(
        and(
          eq(availabilityOverride.userId, session.user.id),
          eq(availabilityOverride.date, date)
        )
      );

    await audit({
      action: "availability.override_removed",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: `Removed availability override for ${date}`,
    });

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Meeting Limits ────────────────────────────────────────────────────────────

export type MeetingLimitPeriod = "day" | "week" | "month";

export interface MeetingLimitRow {
  count: number;
  id: string;
  period: MeetingLimitPeriod;
}

export async function getMeetingLimits(): Promise<MeetingLimitRow[]> {
  const session = await requireSession();
  return db
    .select({
      id: meetingLimit.id,
      period: meetingLimit.period,
      count: meetingLimit.count,
    })
    .from(meetingLimit)
    .where(eq(meetingLimit.userId, session.user.id))
    .orderBy(meetingLimit.createdAt);
}

export async function addMeetingLimit(
  period: MeetingLimitPeriod,
  count: number
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();

    if (!["day", "week", "month"].includes(period)) {
      return { error: "Invalid period." };
    }
    if (!Number.isInteger(count) || count < 1 || count > 999) {
      return { error: "Count must be between 1 and 999." };
    }

    const existing = await db
      .select({ id: meetingLimit.id })
      .from(meetingLimit)
      .where(
        and(
          eq(meetingLimit.userId, session.user.id),
          eq(meetingLimit.period, period)
        )
      );

    if (existing.length > 0) {
      return { error: `A ${period}ly limit already exists. Remove it first.` };
    }

    const [row] = await db
      .insert(meetingLimit)
      .values({ userId: session.user.id, period, count })
      .returning({ id: meetingLimit.id });

    revalidatePath("/availability");
    return { ok: true, id: row.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function removeMeetingLimit(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();

    await db
      .delete(meetingLimit)
      .where(
        and(eq(meetingLimit.id, id), eq(meetingLimit.userId, session.user.id))
      );

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateMeetingLimit(
  id: string,
  count: number
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    if (!Number.isInteger(count) || count < 1 || count > 999) {
      return { error: "Count must be between 1 and 999." };
    }

    await db
      .update(meetingLimit)
      .set({ count })
      .where(
        and(eq(meetingLimit.id, id), eq(meetingLimit.userId, session.user.id))
      );

    revalidatePath("/availability");
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
