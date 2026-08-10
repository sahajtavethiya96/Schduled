import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { and, asc, eq, gte } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  availabilityOverride,
  availabilitySchedule,
  cancellationPolicy,
  eventType,
  eventTypeQuestion,
  user,
  userProfile,
} from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { BookingCalendar } from "./_components/booking-calendar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}): Promise<Metadata> {
  const { username, eventSlug } = await params;
  const [host] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (!host) {
    return {};
  }
  const et = await db.query.eventType.findFirst({
    where: and(
      eq(eventType.userId, host.id),
      eq(eventType.slug, eventSlug),
      eq(eventType.isActive, true)
    ),
  });
  if (!et) {
    return {};
  }
  return {
    title: `${et.name} with ${host.name}`,
    description: et.description ?? `Book a ${et.name} with ${host.name}.`,
    openGraph: {
      title: `${et.name} with ${host.name}`,
      description:
        et.description ?? `Book a ${et.name} with ${host.name} on Schduled.`,
    },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}) {
  const { username, eventSlug } = await params;

  const [host] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      username: user.username,
      jobTitle: userProfile.jobTitle,
      company: userProfile.company,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(user.username, username))
    .limit(1);

  if (!host || !host.username) {
    notFound();
  }

  const et = await db.query.eventType.findFirst({
    where: and(
      eq(eventType.userId, host.id),
      eq(eventType.slug, eventSlug),
      eq(eventType.isActive, true),
      eq(eventType.isHidden, false)
    ),
    with: {
      durations: true,
      questions: {
        where: eq(eventTypeQuestion.isActive, true),
        orderBy: [asc(eventTypeQuestion.position)],
      },
    },
  });

  if (!et) {
    notFound();
  }

  const schedule = await db.query.availabilitySchedule.findFirst({
    where: et.availabilityScheduleId
      ? and(
          eq(availabilitySchedule.id, et.availabilityScheduleId),
          eq(availabilitySchedule.userId, host.id)
        )
      : and(
          eq(availabilitySchedule.userId, host.id),
          eq(availabilitySchedule.isDefault, true)
        ),
    with: { windows: true },
  });

  const hostTz = schedule?.timezone ?? "UTC";
  const now = new Date();
  const today = formatInTimeZone(now, hostTz, "yyyy-MM-dd");
  // Fixed-window events use bookingRangeEnd as the cap; rolling events use bookingWindow days
  const maxDate =
    et.bookingWindowType === "fixed" && et.bookingRangeEnd
      ? et.bookingRangeEnd
      : formatInTimeZone(
          addDays(now, et.bookingWindow ?? 60),
          hostTz,
          "yyyy-MM-dd"
        );

  const availableDaysOfWeek = new Set(
    schedule?.windows.map((w) => w.dayOfWeek) ?? []
  );

  const [cancelPolicy] = await db
    .select({
      showPolicyText: cancellationPolicy.showPolicyText,
      policyText: cancellationPolicy.policyText,
    })
    .from(cancellationPolicy)
    .where(eq(cancellationPolicy.eventTypeId, et.id))
    .limit(1);

  const overrideRows = await db
    .select({
      date: availabilityOverride.date,
      isBlocked: availabilityOverride.isBlocked,
    })
    .from(availabilityOverride)
    .where(
      and(
        eq(availabilityOverride.userId, host.id),
        gte(availabilityOverride.date, today)
      )
    );

  const blockedDates = overrideRows
    .filter((o) => o.isBlocked)
    .map((o) => o.date);
  const specialDates = overrideRows
    .filter((o) => !o.isBlocked)
    .map((o) => o.date);

  const sortedDurations = [...et.durations].sort(
    (a, b) => a.duration - b.duration
  );

  // Only the logged-in owner previewing their own page sees the "Back" control.
  const session = await getCurrentSession();
  const isOwner = session?.user?.id === host.id;

  return (
    <BookingCalendar
      availableDaysOfWeek={Array.from(availableDaysOfWeek)}
      blockedDates={blockedDates}
      eventType={{
        id: et.id,
        name: et.name,
        slug: et.slug,
        description: et.description,
        color: et.color ?? "#0d9488",
        durations: sortedDurations.map((d) => ({
          duration: d.duration,
          isDefault: d.isDefault,
        })),
        locationType: et.locationType,
        locationValue: et.locationValue,
        bookingWindow: et.bookingWindow ?? 60,
        policyText:
          cancelPolicy?.showPolicyText && cancelPolicy.policyText
            ? cancelPolicy.policyText
            : null,
        questions: et.questions.map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options,
          placeholder: q.placeholder,
        })),
      }}
      host={{
        id: host.id,
        name: host.name,
        image: host.image,
        username: host.username,
        jobTitle: host.jobTitle,
        company: host.company,
      }}
      isOwner={isOwner}
      maxDate={maxDate}
      showPoweredBy={env.NEXT_PUBLIC_SHOW_POWERED_BY}
      specialDates={specialDates}
      today={today}
    />
  );
}
