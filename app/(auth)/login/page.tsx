import { Suspense } from "react";
import { AuthForm } from "@/app/(auth)/_components/auth-form";
import { env } from "@/lib/env";
import { getEffectiveSignInMethods } from "@/lib/settings/sign-in-methods";
import { redirectToSetupIfNeeded } from "@/lib/setup";

export const metadata = {
  title: "Sign in",
};

// Never statically prerender: redirectToSetupIfNeeded() and
// getEffectiveSignInMethods() both hit the database on every visit (first-run
// setup gate, live sign-in-method config) — that must run per-request, not
// once at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await redirectToSetupIfNeeded();
  const methods = await getEffectiveSignInMethods();
  return (
    <Suspense>
      <AuthForm
        allowPublicSignup={env.ALLOW_PUBLIC_SIGNUP}
        googleEnabled={methods.google}
        magicLinkEnabled={methods.magicLink}
        passwordEnabled={methods.password}
      />
    </Suspense>
  );
}
