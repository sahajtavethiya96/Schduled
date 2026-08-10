import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const session = await requireSession();

  const [freshUser] = await db
    .select({
      name: user.name,
      username: user.username,
      image: user.image,
      onboardingStep: user.onboardingStep,
      onboardingDone: user.onboardingDone,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // Already finished — nothing to do here.
  if (freshUser?.onboardingDone) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      name={freshUser?.name ?? session.user.name ?? ""}
      onboardingStep={freshUser?.onboardingStep ?? 0}
      userImage={freshUser?.image ?? null}
      username={freshUser?.username ?? null}
    />
  );
}
