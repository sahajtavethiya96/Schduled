import { PageHeader } from "@/components/scaffold/page-header";
import { CookiePreferences } from "./_components/cookie-preferences";

export const metadata = { title: "Cookie Preferences" };

export default function CookiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Control which cookies Schduled may use on your device."
        eyebrow="Settings"
        title="Cookie Preferences"
      />
      <CookiePreferences />
    </div>
  );
}
