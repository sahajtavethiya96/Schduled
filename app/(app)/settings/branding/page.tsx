import { PageHeader } from '@/components/scaffold/page-header'
import { requireAdmin } from '@/lib/authz'
import { emailBranding } from '@/lib/email/branding'
import { getStoredBranding } from '@/lib/settings/branding'
import { BrandingEditor } from './_components/branding-editor'

export const metadata = { title: 'Branding' }

export default async function SettingsBrandingPage() {
  await requireAdmin()

  const storedBranding = await getStoredBranding()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        description="Customize the name, logo, and accent color shown in every email. Falls back to Schduled's defaults when unset."
      />

      <BrandingEditor
        initial={storedBranding}
        defaultAppName={emailBranding.appName}
        defaultBrandColor={emailBranding.brandColor}
      />
    </div>
  )
}
