import { PageHeader } from "@/components/scaffold/page-header";
import { requireAdmin } from "@/lib/authz";
import { isSmtpConfigured } from "@/lib/integration-settings";
import {
  getSignInMethodAvailability,
  getStoredSignInMethods,
} from "@/lib/settings/sign-in-methods";
import { SignInMethodsGrid } from "./_components/sign-in-methods-grid";

export const metadata = { title: "Authentication" };
export const dynamic = "force-dynamic";

export default async function SettingsAuthenticationPage() {
  await requireAdmin();

  const [signInMethods, availability, smtpConfigured] = await Promise.all([
    getStoredSignInMethods(),
    getSignInMethodAvailability(),
    isSmtpConfigured(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Choose which methods users and admins can use to sign in. At least one must stay enabled."
        title="Authentication"
      />

      <SignInMethodsGrid
        availability={availability}
        initial={signInMethods}
        smtpConfigured={smtpConfigured}
      />
    </div>
  );
}
