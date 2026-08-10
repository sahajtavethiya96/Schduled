import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { getEnvIntegrationStatus } from "@/lib/integrations/status";
import { hasAnyUser } from "@/lib/setup";
import { SetupWizard } from "./setup-wizard";

export const metadata = { title: `Set up ${PRODUCT_NAME}` };

// Never statically prerender: hasAnyUser() hits the database on every visit
// (first-run setup gate) and must run per-request, not once at build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // The wizard exists only while the instance has no users, except for the
  // admin's own session mid-wizard: createFirstAdmin() makes hasAnyUser()
  // true partway through, so without the session check a re-render would
  // evict the admin to /login before they finish the "services" step.
  if (!(await getCurrentSession()) && (await hasAnyUser())) {
    redirect("/login");
  }

  return <SetupWizard serviceStatus={await getEnvIntegrationStatus()} />;
}
