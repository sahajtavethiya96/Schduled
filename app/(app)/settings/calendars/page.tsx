import {
  CalendarBlank,
  GoogleLogo,
  MicrosoftOutlookLogo,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { connectedCalendar } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { isGoogleOAuthConfigured } from "@/lib/integration-settings";
import { CalendarActions } from "./_components/calendar-actions";

export const metadata = { title: "Calendars" };

export default async function CalendarsPage() {
  const session = await requireSession();

  const calendars = await db
    .select({
      id: connectedCalendar.id,
      provider: connectedCalendar.provider,
      accountEmail: connectedCalendar.accountEmail,
      calendarName: connectedCalendar.calendarName,
      status: connectedCalendar.status,
      isPrimary: connectedCalendar.isPrimary,
      isConflictCheck: connectedCalendar.isConflictCheck,
      isWriteTarget: connectedCalendar.isWriteTarget,
      createdAt: connectedCalendar.createdAt,
    })
    .from(connectedCalendar)
    .where(eq(connectedCalendar.userId, session.user.id))
    .orderBy(connectedCalendar.createdAt);

  const connectUrl = `${getAppUrl()}/api/integrations/google?returnTo=/settings/calendars`;
  const googleConfigured = await isGoogleOAuthConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          googleConfigured ? (
            <Button asChild size="sm">
              <a href={connectUrl}>
                <Plus size={15} />
                Add calendar
              </a>
            </Button>
          ) : undefined
        }
        description="Connect your calendar to check availability and add events automatically."
        eyebrow="Settings"
        title="Calendars"
      />

      {calendars.length === 0 ? (
        <Empty
          action={
            googleConfigured ? (
              <Button asChild>
                <a href={connectUrl}>
                  <GoogleLogo size={16} />
                  Connect Google Calendar
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Google Calendar integration not configured — add
                GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env
              </p>
            )
          }
          description="Connect a Google Calendar to automatically check your availability and add bookings."
          icon={<CalendarBlank />}
          title="No calendars connected"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connected Calendars</CardTitle>
            <CardDescription>
              Schduled checks these calendars for conflicts and writes new
              bookings to your write target.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {calendars.map((cal) => (
              <CalendarActions
                calendar={{
                  ...cal,
                  createdAt: cal.createdAt.toISOString(),
                }}
                connectUrl={connectUrl}
                key={cal.id}
              />
            ))}

            {/* Microsoft Outlook — coming soon */}
            <div className="flex items-center gap-4 px-6 py-4 opacity-60">
              <div className="flex size-10 shrink-0 items-center justify-center bg-muted">
                <MicrosoftOutlookLogo className="text-foreground" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  Microsoft Outlook
                </p>
                <p className="text-sm text-muted-foreground">
                  Sync availability and add events to Outlook Calendar
                </p>
              </div>
              <span className="shrink-0 bg-muted px-2 py-1 text-xs text-muted-foreground">
                Soon
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
