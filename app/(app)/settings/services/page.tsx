import {
  Envelope,
  GoogleLogo,
  Stack,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/scaffold/page-header";
import { GoogleOAuthSettingsForm } from "@/components/settings-services/google-oauth-settings-form";
import { SmtpSettingsForm } from "@/components/settings-services/smtp-settings-form";
import { StorageSettingsForm } from "@/components/settings-services/storage-settings-form";
import { ZoomOAuthSettingsForm } from "@/components/settings-services/zoom-oauth-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/authz";
import { getIntegrationSettingsSummary } from "@/lib/integration-settings";

export const metadata = { title: "Integration Configuration" };
export const dynamic = "force-dynamic";

function ServiceSection({
  description,
  icon,
  title,
  children,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
            {icon}
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SettingsServicesPage() {
  await requireAdmin();

  const summary = await getIntegrationSettingsSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Configure external services used by this Schduled instance. These settings enable features such as email delivery, Google/Zoom integrations, and cloud storage for all users."
        title="Integration Configuration"
      />

      <ServiceSection
        description="Outbound transactional email via nodemailer. Used for magic links, notifications, and password resets."
        icon={<Envelope size={18} weight="bold" />}
        title="Email / SMTP"
      >
        <SmtpSettingsForm initial={summary.smtp} />
      </ServiceSection>

      <ServiceSection
        description="Social sign-in and Google Calendar integration. Changes to Sign-In credentials need a server restart to take effect; Calendar picks them up immediately."
        icon={<GoogleLogo size={18} weight="bold" />}
        title="Google OAuth"
      >
        <GoogleOAuthSettingsForm initial={summary.google} />
      </ServiceSection>

      <ServiceSection
        description="Zoom OAuth for automatic meeting creation."
        icon={<VideoCamera size={18} weight="bold" />}
        title="Zoom"
      >
        <ZoomOAuthSettingsForm initial={summary.zoom} />
      </ServiceSection>

      <ServiceSection
        description="Where uploaded files (avatars, logos) are stored — local disk, or S3/R2-compatible storage."
        icon={<Stack size={18} weight="bold" />}
        title="File Storage"
      >
        <StorageSettingsForm initial={summary.storage} />
      </ServiceSection>
    </div>
  );
}
