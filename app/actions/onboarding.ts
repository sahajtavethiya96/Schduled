"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  availabilitySchedule,
  availabilityWindow,
  cancellationPolicy,
  eventType,
  eventTypeDuration,
  user,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

type ActionResult<T = Record<never, never>> =
  | { error: string }
  | ({ ok: true } & T);

type DaySchedule = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const RESERVED = new Set([
  "orbit",
  "api",
  "admin",
  "dashboard",
  "settings",
  "login",
  "signup",
  "post-auth",
  "onboarding",
  "privacy",
  "terms",
  "cookies",
  "cancel",
  "reschedule",
  "help",
  "support",
  "about",
  "pricing",
]);

function validateUsername(raw: string): string | null {
  const u = raw.toLowerCase().trim();
  if (u.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (u.length > 30) {
    return "Username must be 30 characters or less.";
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(u)) {
    return "Only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.";
  }
  if (RESERVED.has(u)) {
    return "That username is reserved. Please choose another.";
  }
  return null;
}

export async function saveProfileStep(data: {
  name: string;
  username: string;
}): Promise<ActionResult<{ username: string }>> {
  try {
    const session = await requireSession();

    const name = data.name.trim();
    const username = data.username.toLowerCase().trim();

    if (!name || name.length < 1) {
      return { error: "Name is required." };
    }
    if (name.length > 64) {
      return { error: "Name is too long (max 64 characters)." };
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return { error: usernameError };
    }

    const [conflict] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (conflict && conflict.id !== session.user.id) {
      return {
        error: "That username is already taken. Please choose another.",
      };
    }

    await db
      .update(user)
      .set({ name, username, onboardingStep: 1, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    await audit({
      action: "user.profile_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: "Set name and username during onboarding",
    });

    return { ok: true, username };
  } catch (err) {
    console.error("[onboarding] saveNameStep", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function saveTimezoneStep(
  timezone: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return { error: "Invalid timezone." };
    }

    await db
      .update(user)
      .set({ timezone, onboardingStep: 2, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return { ok: true };
  } catch (err) {
    console.error("[onboarding] saveTimezoneStep", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function saveAvailabilityStep(
  windows: Record<string, DaySchedule>
): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [freshUser] = await db
      .select({ timezone: user.timezone })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const timezone = freshUser?.timezone ?? "UTC";

    await db.transaction(async (tx) => {
      // Delete existing default schedule (cascades to windows)
      await tx
        .delete(availabilitySchedule)
        .where(
          and(
            eq(availabilitySchedule.userId, session.user.id),
            eq(availabilitySchedule.isDefault, true)
          )
        );

      const [schedule] = await tx
        .insert(availabilitySchedule)
        .values({
          userId: session.user.id,
          name: "Working Hours",
          isDefault: true,
          timezone,
        })
        .returning();

      const enabledWindows = DAYS.filter((day) => windows[day]?.enabled).map(
        (day) => ({
          scheduleId: schedule.id,
          dayOfWeek: day,
          startTime: windows[day].startTime,
          endTime: windows[day].endTime,
        })
      );

      if (enabledWindows.length > 0) {
        await tx.insert(availabilityWindow).values(enabledWindows);
      }
    });

    await db
      .update(user)
      .set({ onboardingStep: 3, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    await audit({
      action: "availability.schedule_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      entityType: "user",
      entityId: session.user.id,
      description: "Set default availability during onboarding",
    });

    return { ok: true };
  } catch (err) {
    console.error("[onboarding] saveAvailabilityStep", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function skipCalendarStep(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await db
      .update(user)
      .set({ onboardingStep: 4, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    return { ok: true };
  } catch (err) {
    console.error("[onboarding] skipCalendarStep", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const [existing] = await db
      .select({ id: eventType.id })
      .from(eventType)
      .where(
        and(eq(eventType.userId, session.user.id), eq(eventType.slug, "30-min"))
      )
      .limit(1);

    if (!existing) {
      const etId = createId();

      await db.transaction(async (tx) => {
        await tx.insert(eventType).values({
          id: etId,
          userId: session.user.id,
          name: "30-Minute Meeting",
          slug: "30-min",
          locationType: "google_meet",
          color: "#0d9488",
          isActive: true,
          minimumNotice: 60,
          bookingWindow: 60,
          startTimeIncrement: 30,
          bufferBefore: 0,
          bufferAfter: 0,
          requiresApproval: false,
          position: 0,
        });

        await tx.insert(eventTypeDuration).values({
          id: createId(),
          eventTypeId: etId,
          duration: 30,
          isDefault: true,
        });

        await tx.insert(cancellationPolicy).values({
          id: createId(),
          eventTypeId: etId,
          allowCancellation: true,
          cutoffHours: 24,
        });
      });

      await audit({
        action: "event_type.created",
        actorId: session.user.id,
        actorEmail: session.user.email,
        entityType: "event_type",
        entityId: etId,
        description:
          'Auto-created "30-Minute Meeting" on onboarding completion',
      });
    }

    await db
      .update(user)
      .set({ onboardingDone: true, onboardingStep: 5, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    revalidatePath("/", "layout");
    revalidatePath("/event-types");

    return { ok: true };
  } catch (err) {
    console.error("[completeOnboarding]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
