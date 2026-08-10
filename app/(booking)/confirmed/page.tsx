import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { booking, user } from "@/db/schema";
import { getCurrentSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ConfirmationClient } from "./_components/confirmation-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{
    host?: string;
    slug?: string;
    event?: string;
    ets?: string;
    etid?: string;
    start?: string;
    end?: string;
    tz?: string;
    cancel?: string;
    reschedule?: string;
    loc?: string;
    locValue?: string;
    pending?: string;
  }>;
}) {
  const p = await searchParams;

  if (!p.start || !p.tz || !p.event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
        <p className="text-sm text-muted-foreground">
          Invalid confirmation link.
        </p>
      </main>
    );
  }

  // Verify isPending from the DB rather than trusting the URL param
  let isPending = false;
  if (p.cancel) {
    const [b] = await db
      .select({ status: booking.status })
      .from(booking)
      .where(eq(booking.cancelToken, p.cancel))
      .limit(1);
    isPending = b?.status === "pending";
  }

  // Check if the viewing session user is the host (owner toolbar)
  let isOwner = false;
  if (p.slug) {
    const session = await getCurrentSession();
    if (session?.user?.id) {
      const [hostRow] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, p.slug))
        .limit(1);
      isOwner = hostRow?.id === session.user.id;
    }
  }

  return (
    <ConfirmationClient
      cancelToken={p.cancel ?? null}
      endUtc={p.end ?? null}
      eventName={p.event}
      eventSlug={p.ets ?? null}
      eventTypeId={p.etid ?? null}
      hostName={p.host ?? ""}
      hostUsername={p.slug ?? null}
      isOwner={isOwner}
      isPending={isPending}
      locationType={p.loc ?? "custom"}
      locationValue={p.locValue ?? null}
      rescheduleToken={p.reschedule ?? null}
      showPoweredBy={env.NEXT_PUBLIC_SHOW_POWERED_BY}
      startUtc={p.start}
      timezone={p.tz}
    />
  );
}
