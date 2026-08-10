import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/authz";
import { redirectToSetupIfNeeded } from "@/lib/setup";

// Never statically prerender: both calls below hit the database/session on
// every visit and must run per-request, not once at build time.
export const dynamic = "force-dynamic";

// Landing target after login, reached after both Google OAuth and magic link.
// Everyone lands on the same dashboard; admin-only screens live inside
// /settings, gated by role, not by a separate login flow.
export default async function PostAuthPage() {
  await redirectToSetupIfNeeded();
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
