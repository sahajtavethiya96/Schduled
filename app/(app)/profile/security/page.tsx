import { desc, eq } from "drizzle-orm";
import { PasswordCard } from "@/components/profile/password-card";
import {
  type SessionRow,
  SessionsCard,
} from "@/components/profile/sessions-card";
import { PageHeader } from "@/components/scaffold/page-header";
import {
  bookingBlocklist,
  eventType,
  session as sessionTable,
} from "@/db/schema";
import { passwordAuthEnabled } from "@/lib/auth";
import { userHasPassword } from "@/lib/auth-password";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { BlockedSourcesCard } from "./_components/blocked-sources-card";
import { BookingVerificationCard } from "./_components/booking-verification-card";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const current = await requireSession();

  const [sessions, eventTypes, blocklist, hasPassword] = await Promise.all([
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        id: sessionTable.id,
        ipAddress: sessionTable.ipAddress,
        token: sessionTable.token,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, current.user.id))
      .orderBy(desc(sessionTable.createdAt)),

    db
      .select({
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
        locationType: eventType.locationType,
        requiresEmailVerification: eventType.requiresEmailVerification,
        updatedAt: eventType.updatedAt,
      })
      .from(eventType)
      .where(eq(eventType.userId, current.user.id))
      .orderBy(eventType.name),

    db
      .select({
        id: bookingBlocklist.id,
        pattern: bookingBlocklist.pattern,
        type: bookingBlocklist.type,
        note: bookingBlocklist.note,
        createdAt: bookingBlocklist.createdAt,
      })
      .from(bookingBlocklist)
      .where(eq(bookingBlocklist.userId, current.user.id))
      .orderBy(desc(bookingBlocklist.createdAt)),
    userHasPassword(current.user.id),
  ]);

  const sessionRows: SessionRow[] = sessions.map((s) => ({
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    id: s.id,
    ipAddress: s.ipAddress,
    isCurrent: s.token === current.session.token,
    userAgent: s.userAgent,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage your login method, active sessions, and booking security settings."
        eyebrow="Profile"
        title="Security"
      />

      {/* Password */}
      <PasswordCard
        hasPassword={hasPassword}
        passwordAuthEnabled={passwordAuthEnabled}
      />

      {/* Active sessions */}
      <SessionsCard sessions={sessionRows} />

      {/* Booking Verification */}
      <BookingVerificationCard
        eventTypes={eventTypes.map((e) => ({
          ...e,
          color: e.color ?? "#0d9488",
        }))}
      />

      {/* Blocked Sources */}
      <BlockedSourcesCard entries={blocklist} />
    </div>
  );
}
