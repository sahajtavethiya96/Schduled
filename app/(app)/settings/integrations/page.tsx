import { GoogleLogo, MicrosoftOutlookLogo, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { and, eq } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { connectedCalendar, videoConnection } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";
import { ZoomDisconnectButton } from "./_components/zoom-action";

export const metadata = { title: "Integrations" };

interface IntegrationRowProps {
  action?: React.ReactNode;
  badge?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  name: string;
}

function IntegrationRow({
  icon,
  name,
  description,
  badge,
  action,
}: IntegrationRowProps) {
  return (
    <div className="flex items-center gap-4 py-5">
      <div className="flex size-12 shrink-0 items-center justify-center border border-border bg-muted/50">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{name}</p>
          {badge}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default async function IntegrationsPage() {
  const session = await requireSession();

  const googleCal = await db
    .select({
      id: connectedCalendar.id,
      accountEmail: connectedCalendar.accountEmail,
      status: connectedCalendar.status,
    })
    .from(connectedCalendar)
    .where(eq(connectedCalendar.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  const googleConnectUrl = `${getAppUrl()}/api/integrations/google?returnTo=/settings/integrations`;
  const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  const zoomConn = await db
    .select({
      id: videoConnection.id,
      accountEmail: videoConnection.accountEmail,
    })
    .from(videoConnection)
    .where(
      and(
        eq(videoConnection.userId, session.user.id),
        eq(videoConnection.provider, "zoom")
      )
    )
    .limit(1)
    .then((r) => r[0]);
  const zoomConnectUrl = `${getAppUrl()}/api/integrations/zoom?returnTo=/settings/integrations`;
  const zoomConfigured = !!(env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Connect third-party services to power your meetings."
        eyebrow="Settings"
        title="Integrations"
      />

      <Card>
        <CardHeader>
          <CardTitle>Video Conferencing</CardTitle>
          <CardDescription>
            Automatically generate meeting links for your bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 px-6">
          {/* Google Meet */}
          <IntegrationRow
            action={
              googleCal?.status === "connected" ? (
                <Button asChild size="sm" variant="outline">
                  <a href="/settings/calendars">Manage</a>
                </Button>
              ) : googleConfigured ? (
                <Button asChild size="sm">
                  <a href={googleConnectUrl}>Connect</a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Requires setup
                </span>
              )
            }
            badge={
              googleCal?.status === "connected" ? (
                <Badge
                  className="text-primary"
                  variant="secondary"
                >
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )
            }
            description="Generate Google Meet links automatically when Google Calendar is connected."
            icon={<GoogleLogo size={20} weight="bold" />}
            name="Google Meet"
          />

          {/* Zoom */}
          <IntegrationRow
            action={
              zoomConn ? (
                <ZoomDisconnectButton />
              ) : zoomConfigured ? (
                <Button asChild size="sm">
                  <a href={zoomConnectUrl}>Connect</a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Requires setup
                </span>
              )
            }
            badge={
              zoomConn ? (
                <Badge
                  className="text-primary"
                  variant="secondary"
                >
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )
            }
            description={
              zoomConn
                ? `Connected as ${zoomConn.accountEmail}`
                : "Generate Zoom meeting links automatically for video bookings."
            }
            icon={<VideoCamera size={20} />}
            name="Zoom"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            Manage calendar connections used for scheduling.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 px-6">
          <IntegrationRow
            action={
              <Button asChild size="sm" variant="outline">
                <a href="/settings/calendars">
                  {googleCal?.status === "connected" ? "Manage" : "Connect"}
                </a>
              </Button>
            }
            badge={
              googleCal?.status === "connected" ? (
                <Badge
                  className="text-primary"
                  variant="secondary"
                >
                  Connected
                </Badge>
              ) : undefined
            }
            description={
              googleCal?.status === "connected"
                ? `Connected as ${googleCal.accountEmail}`
                : "Sync bookings and check availability with Google Calendar."
            }
            icon={<GoogleLogo size={20} weight="bold" />}
            name="Google Calendar"
          />

          {/* Microsoft Outlook — coming soon */}
          <div className="opacity-60">
            <IntegrationRow
              action={
                <span className="bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Soon
                </span>
              }
              description="Sync bookings and check availability with Outlook Calendar."
              icon={<MicrosoftOutlookLogo size={20} />}
              name="Microsoft Outlook"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
