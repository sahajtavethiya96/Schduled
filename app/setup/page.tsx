import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getEnvIntegrationStatus } from "@/lib/integrations/status";
import { hasAnyUser } from "@/lib/setup";
import { SetupWizard } from "./setup-wizard";

export const metadata = { title: `Set up ${PRODUCT_NAME}` };

// Never statically prerender: hasAnyUser() hits the database on every
// visit (first-run setup gate) — that must run per-request, not once at
// build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Runs once: the wizard exists only while the instance has no users —
  // EXCEPT for the admin's own session mid-wizard. createFirstAdmin() runs
  // partway through, making hasAnyUser() true while the admin is still on
  // the "services" step; without the session check, a later re-render would
  // re-trigger this gate and evict them to /login. An unauthenticated
  // visitor after setup is done still gets sent to /login as before.
  if (!(await getCurrentSession()) && (await hasAnyUser())) {
    redirect("/login");
  }

  return <SetupWizard serviceStatus={await getEnvIntegrationStatus()} />;
}
