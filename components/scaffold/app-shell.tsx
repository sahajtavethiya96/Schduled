import { Suspense, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AutofillScrollFix } from "./autofill-scroll-fix";
import { HeaderAvatar } from "./header-avatar";
import { GlobalSearch } from "./global-search";
import { ImpersonationBanner } from "./impersonation-banner";
import { JoinSoonBar } from "./join-soon-bar";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { ScrollReset } from "./scroll-reset";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({
  children,
  email,
  userName,
  isAdmin = false,
  userImage,
  isImpersonating = false,
  impersonatedUserName,
}: {
  children: ReactNode;
  email: string;
  userName?: string | null;
  isAdmin?: boolean;
  userImage?: string | null;
  isImpersonating?: boolean;
  impersonatedUserName?: string | null;
}) {
  return (
    <div data-app-shell className="flex h-dvh overflow-hidden">

      {/* ── Full-height sidebar — desktop only ───────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border overflow-y-auto no-scrollbar">
        <SidebarNav
          email={email}
          userName={userName}
          isAdmin={isAdmin}
          userImage={userImage}
        />
      </aside>

      {/* ── Right side: top bar + content ────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Impersonation banner */}
        {isImpersonating && (
          <ImpersonationBanner userName={impersonatedUserName ?? email} />
        )}

        {/* Top bar — spans only the content area */}
        <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-background z-40">
          <Suspense fallback={<div className="h-9 w-48 md:w-72 border border-border bg-page" />}>
            <GlobalSearch />
          </Suspense>

          <div className="flex items-center gap-0.5 ml-auto">
            <ThemeToggle />
            <NotificationBell />
            <HeaderAvatar />
          </div>
        </header>

        {/* "Join soon" countdown bar — slides in when a meeting is imminent */}
        <JoinSoonBar />

        {/* Page content */}
        <main data-app-main className="flex-1 overflow-y-auto overflow-x-clip bg-page pb-16 md:pb-0 [scrollbar-gutter:stable]">
          <ScrollReset />
          <AutofillScrollFix />
          <div className="mx-auto max-w-7xl px-4 md:px-6 pt-4 pb-6 md:pt-5 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <MobileNav />
    </div>
  );
}
