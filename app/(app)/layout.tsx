import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AvatarProvider } from "@/components/avatar-context";
import { AppShell } from "@/components/scaffold/app-shell";
import { GuidedTour } from "@/components/tour/guided-tour";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const [freshUser] = await db
    .select({
      email: user.email,
      role: user.role,
      name: user.name,
      username: user.username,
      image: user.image,
      onboardingDone: user.onboardingDone,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // Onboarding runs as its own full page at /onboarding, not an overlay. Send
  // anyone who hasn't finished there before rendering the app shell.
  if (freshUser && !freshUser.onboardingDone) {
    redirect("/onboarding");
  }

  const isImpersonating = !!session.session.impersonatedBy;

  return (
    <AvatarProvider initialUrl={freshUser?.image ?? null}>
      <AppShell
        email={freshUser?.email ?? session.user.email}
        impersonatedUserName={freshUser?.name ?? null}
        isAdmin={freshUser?.role === ADMIN_ROLE}
        isImpersonating={isImpersonating}
        userImage={freshUser?.image ?? null}
        userName={freshUser?.name ?? null}
      >
        {freshUser?.onboardingDone && <GuidedTour userId={session.user.id} />}
        {children}
      </AppShell>
    </AvatarProvider>
  );
}
