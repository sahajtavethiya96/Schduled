import {
  CheckCircle,
  Database,
  Envelope,
  GearSix,
  GoogleLogo,
  Key,
  LockKey,
  ShieldCheck,
  Stack,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { PageHeader } from "@/components/scaffold/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/authz";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";
import { getEnvIntegrationStatus } from "@/lib/integrations/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "System Status" };

export default async function SettingsPlatformPage() {
  await requireAdmin();

  const { smtpConfigured, googleConfigured, zoomConfigured } =
    await getEnvIntegrationStatus();
  const appSecretSet = !!env.APP_SECRET;
  const encryptionKeySet = !!env.ENCRYPT_KEY;
  const databaseUrlSet = !!env.DATABASE_URL;
  const passwordAuthEnabled = env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED;
  const allowPublicSignup = env.ALLOW_PUBLIC_SIGNUP;

  const appUrl = getAppUrl();
  const nodeEnv = env.NODE_ENV;

  const healthItems = [
    {
      label: "Database",
      ok: databaseUrlSet,
      description: "PostgreSQL connection",
      icon: <Database size={15} weight="bold" />,
    },
    {
      label: "SMTP / Email",
      ok: smtpConfigured,
      description: "Transactional email",
      icon: <Envelope size={15} weight="bold" />,
    },
    {
      label: "Google OAuth",
      ok: googleConfigured,
      description: "Social sign-in + Calendar",
      icon: <GoogleLogo size={15} weight="bold" />,
    },
    {
      label: "Zoom",
      ok: zoomConfigured,
      description: "Meeting creation",
      icon: <VideoCamera size={15} weight="bold" />,
    },
    {
      label: "App Secret",
      ok: appSecretSet,
      description: "Session signing key",
      icon: <LockKey size={15} weight="bold" />,
    },
    {
      label: "Encryption Key",
      ok: encryptionKeySet,
      description: "OAuth token encryption",
      icon: <Key size={15} weight="bold" />,
    },
  ];

  const healthyCount = healthItems.filter((h) => h.ok).length;
  const totalCount = healthItems.length;
  const allHealthy = healthyCount === totalCount;
  const warningCount = totalCount - healthyCount;

  const integrationCount = [
    smtpConfigured,
    googleConfigured,
    zoomConfigured,
    databaseUrlSet,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          description="View the health and status of configured services and environment."
          title="System Status"
        />
        <div className="flex flex-wrap gap-3">
          <StatChip
            label={allHealthy ? "Healthy" : "Needs Attention"}
            tone={allHealthy ? "success" : "warning"}
            value={`${healthyCount}/${totalCount}`}
          />
          <StatChip
            label="Integrations"
            tone="neutral"
            value={`${integrationCount}/4`}
          />
          {warningCount > 0 && (
            <StatChip
              label="Warnings"
              tone="warning"
              value={String(warningCount)}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          This page is read-only. Configuration is managed through environment
          variables and integration settings.
        </p>
      </div>

      {/* ── Platform Health ── */}
      <Section
        action={
          <HealthSummaryChip
            allHealthy={allHealthy}
            healthyCount={healthyCount}
            totalCount={totalCount}
          />
        }
        description="Status of all connected services and credentials, checked on page load."
        icon={<ShieldCheck size={15} weight="bold" />}
        title="Platform Health"
      >
        <Card>
          <CardContent className="p-0">
            {healthItems.map((item, i) => (
              <StatusRow
                key={item.label}
                {...item}
                failText="Not configured"
                first={i === 0}
                okText="Healthy"
              />
            ))}
          </CardContent>
        </Card>
      </Section>

      <SectionDivider />

      {/* ── General ── */}
      <Section
        description="Core platform configuration and runtime environment."
        icon={<GearSix size={15} weight="bold" />}
        title="General"
      >
        <Card>
          <CardContent className="p-0">
            <ConfigRow first label="App URL" mono value={appUrl} />
            <ConfigRow label="Environment" value={nodeEnv} />
            <ConfigRow
              label="Password Auth"
              manageHref="/settings/authentication"
              ok={passwordAuthEnabled}
              value={passwordAuthEnabled ? "Enabled" : "Disabled"}
            />
            <ConfigRow
              label="Public Signup"
              ok={allowPublicSignup}
              value={allowPublicSignup ? "Enabled" : "Disabled"}
            />
          </CardContent>
        </Card>
      </Section>

      <SectionDivider />

      {/* ── Integrations ── */}
      <Section
        description="Third-party service connection status based on environment variables."
        icon={<Stack size={15} weight="bold" />}
        title="Integrations"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <IntegrationCard
            description="Outbound transactional email via nodemailer"
            docAnchor="email-smtp"
            icon={<Envelope size={18} weight="bold" />}
            name="SMTP / Email"
            ok={smtpConfigured}
          />
          <IntegrationCard
            description="Social sign-in and Google Calendar integration"
            docAnchor="google-calendar--google-meet"
            icon={<GoogleLogo size={18} weight="bold" />}
            name="Google OAuth + Calendar"
            ok={googleConfigured}
          />
          <IntegrationCard
            description="Zoom OAuth for automatic meeting creation"
            docAnchor="zoom"
            icon={<VideoCamera size={18} weight="bold" />}
            name="Zoom"
            ok={zoomConfigured}
          />
          <IntegrationCard
            description="Background job processing (reminders, emails, calendar)"
            failText="DATABASE_URL missing"
            icon={<Stack size={18} weight="bold" />}
            name="pg-boss Job Queue"
            ok={databaseUrlSet}
          />
        </div>
      </Section>

      <SectionDivider />

      {/* ── Security ── */}
      <Section
        description="Authentication secrets and encryption keys."
        icon={<ShieldCheck size={15} weight="bold" />}
        title="Security"
      >
        <Card>
          <CardContent className="p-0">
            <StatusRow
              description="Better Auth session signing key (APP_SECRET)"
              failText="Not set — CRITICAL"
              first
              icon={<LockKey size={15} weight="bold" />}
              label="App Secret"
              ok={appSecretSet}
              okText="Set"
            />
            <StatusRow
              description="AES-GCM key for OAuth token storage (ENCRYPT_KEY)"
              failText="Not set — CRITICAL"
              icon={<Key size={15} weight="bold" />}
              label="Encryption Key"
              ok={encryptionKeySet}
              okText="Set"
            />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
            {icon}
          </span>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionDivider() {
  return <div className="border-t border-border" />;
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 border px-3.5 py-2",
        tone === "success" && "border-success/25 bg-success/[0.04]",
        tone === "warning" && "border-amber-500/25 bg-amber-500/[0.04]",
        tone === "neutral" && "border-border bg-muted/30"
      )}
    >
      <span
        className={cn(
          "text-lg font-bold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-amber-600 dark:text-amber-500",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function HealthSummaryChip({
  allHealthy,
  healthyCount,
  totalCount,
}: {
  allHealthy: boolean;
  healthyCount: number;
  totalCount: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 border px-3 py-1.5 text-sm font-semibold tabular-nums",
        allHealthy
          ? "border-success/25 bg-success/[0.06] text-success"
          : "border-amber-500/25 bg-amber-500/[0.06] text-amber-600 dark:text-amber-500"
      )}
    >
      {allHealthy ? (
        <CheckCircle size={15} weight="fill" />
      ) : (
        <Warning size={15} weight="fill" />
      )}
      {healthyCount}/{totalCount} Healthy
    </span>
  );
}

// ── Row/card primitives ─────────────────────────────────────────────────────────

function ConfigRow({
  label,
  value,
  mono = false,
  ok,
  first = false,
  manageHref,
}: {
  label: string;
  value: string;
  mono?: boolean;
  ok?: boolean;
  first?: boolean;
  manageHref?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 py-3",
        !first && "border-t border-border"
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {ok !== undefined && (
            <span
              className={cn(
                "size-1.5 rounded-full",
                ok ? "bg-success" : "bg-muted-foreground/40"
              )}
            />
          )}
          <p
            className={cn(
              "text-sm text-muted-foreground",
              mono && "font-mono text-xs",
              ok === true && "text-success",
              ok === false && "text-muted-foreground"
            )}
          >
            {value}
          </p>
        </div>
        {manageHref && (
          <Link
            className="text-xs font-semibold text-primary hover:underline"
            href={manageHref}
          >
            Manage →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  description,
  ok,
  okText,
  failText,
  first = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  ok: boolean;
  okText: string;
  failText: string;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 px-6 py-4",
        !first && "border-t border-border"
      )}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold",
          ok
            ? "border-success/25 bg-success/10 text-success"
            : "border-destructive/25 bg-destructive/10 text-destructive"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            ok ? "bg-success" : "bg-destructive"
          )}
        />
        {ok ? okText : failText}
      </span>
    </div>
  );
}

function IntegrationCard({
  icon,
  name,
  description,
  ok,
  failText = "Not configured",
  docAnchor,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  ok: boolean;
  failText?: string;
  docAnchor?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border p-4 transition-colors",
        ok ? "border-success/20 bg-success/[0.03]" : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold",
            ok
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              ok ? "bg-success" : "bg-destructive"
            )}
          />
          {ok ? "Configured" : failText}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {!ok && docAnchor && (
        <a
          className="text-xs font-semibold text-primary hover:underline"
          href={`https://github.com/dhruti-snapdevio/Schduled/blob/main/docs/self-hosting/integrations.md#${docAnchor}`}
          rel="noreferrer"
          target="_blank"
        >
          Configure →
        </a>
      )}
    </div>
  );
}
