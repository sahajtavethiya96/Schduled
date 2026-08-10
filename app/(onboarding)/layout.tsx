import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

// Standalone chrome for the onboarding flow — no app sidebar/header. A signed-in
// user who hasn't finished onboarding is redirected here from (app)/layout.tsx.
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-page px-4 py-10">
      {/* Ambient glow — matches the auth pages' treatment. Clipped in its own
          layer so the page itself can still grow/scroll on short screens. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 bg-primary/[0.10] blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 bg-cyan-400/[0.07] blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10">
        <Logo href="/" size="md" variant="full" />
      </div>

      {/* Wizard */}
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
