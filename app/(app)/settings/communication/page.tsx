import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { notificationPreference } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { CommunicationForm } from "./_components/communication-form";

export const metadata = { title: "Communication" };

export default async function CommunicationPage() {
  const session = await requireSession();

  const [prefs] = await db
    .select()
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, session.user.id))
    .limit(1);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Choose which email notifications you and your invitees receive."
        eyebrow="Settings"
        title="Communication"
      />
      <CommunicationForm
        initial={{
          bookingConfirmationEmail: prefs?.bookingConfirmationEmail ?? true,
          bookingNotificationEmail: prefs?.bookingNotificationEmail ?? true,
          reminderEmail24h: prefs?.reminderEmail24h ?? true,
          reminderEmail1h: prefs?.reminderEmail1h ?? true,
          cancellationEmail: prefs?.cancellationEmail ?? true,
          rescheduleEmail: prefs?.rescheduleEmail ?? true,
          joinSoonLeadMinutes: prefs?.joinSoonLeadMinutes ?? 30,
          fromName: prefs?.fromName ?? "",
          replyToEmail: prefs?.replyToEmail ?? "",
        }}
      />
    </div>
  );
}
