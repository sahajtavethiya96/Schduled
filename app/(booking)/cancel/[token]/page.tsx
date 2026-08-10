import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { booking, cancellationPolicy, eventType, user } from "@/db/schema";
import { db } from "@/lib/db";
import { CancelClient } from "./cancel-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [b] = await db
    .select({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      inviteeName: booking.inviteeName,
      inviteeTimezone: booking.inviteeTimezone,
      etName: eventType.name,
      etId: eventType.id,
      hostName: user.name,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .innerJoin(user, eq(user.id, booking.hostUserId))
    .where(eq(booking.cancelToken, token))
    .limit(1);

  if (!b) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This cancellation link is invalid or has expired.
          </CardContent>
        </Card>
      </main>
    );
  }

  const [policy] = await db
    .select({
      allowCancellation: cancellationPolicy.allowCancellation,
      cutoffHours: cancellationPolicy.cutoffHours,
      requireCancellationReason: cancellationPolicy.requireCancellationReason,
      showPolicyText: cancellationPolicy.showPolicyText,
      policyText: cancellationPolicy.policyText,
    })
    .from(cancellationPolicy)
    .where(eq(cancellationPolicy.eventTypeId, b.etId))
    .limit(1);

  const hoursUntil =
    (new Date(b.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

  const isBlocked =
    policy?.allowCancellation === false ||
    (!!policy?.cutoffHours &&
      policy.cutoffHours > 0 &&
      hoursUntil < policy.cutoffHours);

  return (
    <CancelClient
      alreadyCancelled={b.status === "cancelled"}
      blockedByPolicy={isBlocked}
      cutoffHours={policy?.cutoffHours ?? 0}
      eventName={b.etName}
      hostName={b.hostName ?? "your host"}
      inviteeName={b.inviteeName}
      inviteeTimezone={b.inviteeTimezone}
      isPast={new Date(b.startTime).getTime() < Date.now()}
      policyText={policy?.policyText ?? null}
      requireCancellationReason={policy?.requireCancellationReason ?? false}
      showPolicyText={policy?.showPolicyText ?? false}
      startUtc={b.startTime.toISOString()}
      token={token}
    />
  );
}
