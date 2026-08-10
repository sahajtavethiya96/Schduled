import { redirect } from "next/navigation";

// Old duplicate that double-rendered AppShell; kept as a redirect for stale links.
export default function DashboardProfileRedirect() {
  redirect("/profile/profile");
}
