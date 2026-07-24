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
} from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { PageHeader } from '@/components/scaffold/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdmin } from '@/lib/authz'
import { env } from '@/lib/env'
import { getAppUrl } from '@/lib/get-app-url'
import { cn } from '@/lib/utils'

export const metadata = { title: 'System Status' }

export default async function SettingsPlatformPage() {
  await requireAdmin()

  const smtpConfigured      = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER)
  const googleConfigured    = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
  const zoomConfigured      = !!(env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET)
  const appSecretSet        = !!env.APP_SECRET
  const encryptionKeySet    = !!env.ENCRYPT_KEY
  const databaseUrlSet      = !!env.DATABASE_URL
  const passwordAuthEnabled = env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED
  const signupEnabled       = env.SIGNUP_ENABLED

  const appUrl  = getAppUrl()
  const nodeEnv = env.NODE_ENV

  const healthItems = [
    { label: 'Database',       ok: databaseUrlSet,   description: 'PostgreSQL connection',       icon: <Database size={15} weight="bold" /> },
    { label: 'SMTP / Email',   ok: smtpConfigured,   description: 'Transactional email',         icon: <Envelope size={15} weight="bold" /> },
    { label: 'Google OAuth',   ok: googleConfigured, description: 'Social sign-in + Calendar',   icon: <GoogleLogo size={15} weight="bold" /> },
    { label: 'Zoom',           ok: zoomConfigured,   description: 'Meeting creation',            icon: <VideoCamera size={15} weight="bold" /> },
    { label: 'App Secret',     ok: appSecretSet,     description: 'Session signing key',         icon: <LockKey size={15} weight="bold" /> },
    { label: 'Encryption Key', ok: encryptionKeySet, description: 'OAuth token encryption',      icon: <Key size={15} weight="bold" /> },
  ]

  const healthyCount = healthItems.filter(h => h.ok).length
  const totalCount   = healthItems.length
  const allHealthy   = healthyCount === totalCount
  const warningCount = totalCount - healthyCount

  const integrationCount = [smtpConfigured, googleConfigured, zoomConfigured, databaseUrlSet].filter(Boolean).length

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          title="System Status"
          description="View the health and status of configured services and environment."
        />
        <div className="flex flex-wrap gap-3">
          <StatChip label={allHealthy ? 'Healthy' : 'Needs Attention'} value={`${healthyCount}/${totalCount}`} tone={allHealthy ? 'success' : 'warning'} />
          <StatChip label="Integrations" value={`${integrationCount}/4`} tone="neutral" />
          {warningCount > 0 && <StatChip label="Warnings" value={String(warningCount)} tone="warning" />}
        </div>
        <p className="text-sm text-muted-foreground">
          This page is read-only. Configuration is managed through environment variables and integration settings.
        </p>
      </div>

      {/* ── Platform Health ── */}
      <Section
        icon={<ShieldCheck size={15} weight="bold" />}
        title="Platform Health"
        description="Status of all connected services and credentials, checked on page load."
        action={<HealthSummaryChip allHealthy={allHealthy} healthyCount={healthyCount} totalCount={totalCount} />}
      >
        <Card>
          <CardContent className="p-0">
            {healthItems.map((item, i) => (
              <StatusRow key={item.label} {...item} okText="Healthy" failText="Not configured" first={i === 0} />
            ))}
          </CardContent>
        </Card>
      </Section>

      <SectionDivider />

      {/* ── General ── */}
      <Section
        icon={<GearSix size={15} weight="bold" />}
        title="General"
        description="Core platform configuration and runtime environment."
      >
        <Card>
          <CardContent className="p-0">
            <ConfigRow label="App URL"       value={appUrl}                                      mono first />
            <ConfigRow label="Environment"   value={nodeEnv} />
            <ConfigRow label="Password Auth" value={passwordAuthEnabled ? 'Enabled' : 'Disabled'} ok={passwordAuthEnabled} manageHref="/settings/authentication" />
            <ConfigRow label="User Signup"   value={signupEnabled ? 'Enabled' : 'Disabled'}       ok={signupEnabled} />
          </CardContent>
        </Card>
      </Section>

      <SectionDivider />

      {/* ── Integrations ── */}
      <Section
        icon={<Stack size={15} weight="bold" />}
        title="Integrations"
        description="Third-party service connection status based on environment variables."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <IntegrationCard
            icon={<Envelope size={18} weight="bold" />}
            name="SMTP / Email"
            description="Outbound transactional email via nodemailer"
            ok={smtpConfigured}
            docAnchor="email-smtp"
          />
          <IntegrationCard
            icon={<GoogleLogo size={18} weight="bold" />}
            name="Google OAuth + Calendar"
            description="Social sign-in and Google Calendar integration"
            ok={googleConfigured}
            docAnchor="google-calendar--google-meet"
          />
          <IntegrationCard
            icon={<VideoCamera size={18} weight="bold" />}
            name="Zoom"
            description="Zoom OAuth for automatic meeting creation"
            ok={zoomConfigured}
            docAnchor="zoom"
          />
          <IntegrationCard
            icon={<Stack size={18} weight="bold" />}
            name="pg-boss Job Queue"
            description="Background job processing (reminders, emails, calendar)"
            ok={databaseUrlSet}
            failText="DATABASE_URL missing"
          />
        </div>
      </Section>

      <SectionDivider />

      {/* ── Security ── */}
      <Section
        icon={<ShieldCheck size={15} weight="bold" />}
        title="Security"
        description="Authentication secrets and encryption keys."
      >
        <Card>
          <CardContent className="p-0">
            <StatusRow
              icon={<LockKey size={15} weight="bold" />}
              label="App Secret"
              description="Better Auth session signing key (APP_SECRET)"
              ok={appSecretSet}
              okText="Set"
              failText="Not set — CRITICAL"
              first
            />
            <StatusRow
              icon={<Key size={15} weight="bold" />}
              label="Encryption Key"
              description="AES-GCM key for OAuth token storage (ENCRYPT_KEY)"
              ok={encryptionKeySet}
              okText="Set"
              failText="Not set — CRITICAL"
            />
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Section({
  icon, title, description, action, children,
}: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; children: React.ReactNode
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
  )
}

function SectionDivider() {
  return <div className="border-t border-border" />
}

function StatChip({
  label, value, tone,
}: {
  label: string; value: string; tone: 'success' | 'warning' | 'neutral'
}) {
  return (
    <div className={cn(
      'flex items-baseline gap-2 border px-3.5 py-2',
      tone === 'success' && 'border-success/25 bg-success/[0.04]',
      tone === 'warning' && 'border-amber-500/25 bg-amber-500/[0.04]',
      tone === 'neutral' && 'border-border bg-muted/30',
    )}>
      <span className={cn(
        'text-lg font-bold tabular-nums',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-amber-600 dark:text-amber-500',
        tone === 'neutral' && 'text-foreground',
      )}>
        {value}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function HealthSummaryChip({
  allHealthy, healthyCount, totalCount,
}: {
  allHealthy: boolean; healthyCount: number; totalCount: number
}) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-2 border px-3 py-1.5 text-sm font-semibold tabular-nums',
      allHealthy
        ? 'border-success/25 bg-success/[0.06] text-success'
        : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-600 dark:text-amber-500'
    )}>
      {allHealthy
        ? <CheckCircle size={15} weight="fill" />
        : <Warning size={15} weight="fill" />
      }
      {healthyCount}/{totalCount} Healthy
    </span>
  )
}

// ── Row/card primitives ─────────────────────────────────────────────────────────

function ConfigRow({
  label, value, mono = false, ok, first = false, manageHref,
}: {
  label: string; value: string; mono?: boolean; ok?: boolean; first?: boolean; manageHref?: string
}) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-3', !first && 'border-t border-border')}>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {ok !== undefined && (
            <span className={cn('size-1.5 rounded-full', ok ? 'bg-success' : 'bg-muted-foreground/40')} />
          )}
          <p className={cn(
            'text-sm text-muted-foreground',
            mono && 'font-mono text-xs',
            ok === true  && 'text-success',
            ok === false && 'text-muted-foreground',
          )}>
            {value}
          </p>
        </div>
        {manageHref && (
          <Link href={manageHref} className="text-xs font-semibold text-primary hover:underline">
            Manage →
          </Link>
        )}
      </div>
    </div>
  )
}

function StatusRow({
  icon, label, description, ok, okText, failText, first = false,
}: {
  icon: React.ReactNode; label: string; description: string
  ok: boolean; okText: string; failText: string; first?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-6 px-6 py-4', !first && 'border-t border-border')}>
      <div className="flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className={cn(
        'inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold',
        ok
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-destructive/25 bg-destructive/10 text-destructive'
      )}>
        <span className={cn('size-1.5 rounded-full', ok ? 'bg-success' : 'bg-destructive')} />
        {ok ? okText : failText}
      </span>
    </div>
  )
}

function IntegrationCard({
  icon, name, description, ok, failText = 'Not configured', docAnchor,
}: {
  icon: React.ReactNode; name: string; description: string; ok: boolean
  failText?: string; docAnchor?: string
}) {
  return (
    <div className={cn(
      'flex flex-col gap-3 border p-4 transition-colors',
      ok ? 'border-success/20 bg-success/[0.03]' : 'border-border'
    )}>
      <div className="flex items-center justify-between">
        <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <span className={cn(
          'inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold',
          ok
            ? 'border-success/25 bg-success/10 text-success'
            : 'border-destructive/25 bg-destructive/10 text-destructive'
        )}>
          <span className={cn('size-1.5 rounded-full', ok ? 'bg-success' : 'bg-destructive')} />
          {ok ? 'Configured' : failText}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {!ok && docAnchor && (
        <a
          href={`https://github.com/dhruti-snapdevio/Schduled/blob/main/docs/self-hosting/integrations.md#${docAnchor}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Configure →
        </a>
      )}
    </div>
  )
}
