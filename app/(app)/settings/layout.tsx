import { eq } from "drizzle-orm";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { SettingsNav, SettingsMobileNav } from "./_components/settings-nav";
import { SettingsSearch } from "./_components/settings-search";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const [freshUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const isAdmin = freshUser?.role === ADMIN_ROLE;

  return (
    <>
      {/* Mobile: search + horizontal scroll nav */}
      <div className="mb-6 space-y-3 md:hidden">
        <SettingsSearch isAdmin={isAdmin} />
        <SettingsMobileNav isAdmin={isAdmin} />
      </div>

      <div className="flex items-start gap-8">
        <aside className="hidden w-52 shrink-0 space-y-4 md:block md:sticky md:top-6 md:self-start">
          <SettingsNav isAdmin={isAdmin} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
