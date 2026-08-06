"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PROFILE_LINKS = [
  { href: "/profile/profile", label: "Profile" },
  { href: "/profile/security", label: "Security" },
  { href: "/profile/login", label: "Connected Accounts" },
];

const WORKSPACE_LINKS = [
  { href: "/settings/my-link", label: "Booking Link" },
  { href: "/settings/calendars", label: "Calendar Sync" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/communication", label: "Notifications" },
  { href: "/settings/contacts", label: "Contact settings" },
  { href: "/settings/cookies", label: "Cookies" },
];

const PLATFORM_LINKS = [
  { href: "/settings/services", label: "Integration Configuration" },
  { href: "/settings/authentication", label: "Authentication" },
  { href: "/settings/branding", label: "Branding" },
  { href: "/settings/platform", label: "System Status" },
];

// "Members" (/settings/users) is intentionally hidden from nav for now — no
// invite/teams flow exists yet, so admin-visible user management isn't useful
// until that ships. The route and its code are untouched; re-add the link
// here when teams/invites land.
const ADMIN_LINKS = [
  { href: "/settings/audit", label: "Audit Logs" },
  { href: "/settings/jobs", label: "Background Jobs" },
];

const PROFILE_PATHS = [
  "/profile/profile",
  "/profile/security",
  "/profile/login",
];

function isProfileSection(pathname: string) {
  return PROFILE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            className={cn(
              "border-l-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavGroup({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="px-3 pb-1 text-2xs font-bold uppercase tracking-ui text-muted-foreground/70">
        {label}
      </p>
      <NavLinks links={links} />
    </div>
  );
}

export function SettingsNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  if (isProfileSection(pathname)) {
    return <NavLinks links={PROFILE_LINKS} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && <NavGroup label="Platform" links={PLATFORM_LINKS} />}
      <NavGroup label="Workspace" links={WORKSPACE_LINKS} />
      {isAdmin && <NavGroup label="Administration" links={ADMIN_LINKS} />}
    </div>
  );
}

export function SettingsMobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isProfileSection(pathname)
    ? PROFILE_LINKS
    : isAdmin
      ? [...PLATFORM_LINKS, ...WORKSPACE_LINKS, ...ADMIN_LINKS]
      : WORKSPACE_LINKS;

  return (
    <nav className="flex overflow-x-auto gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border pb-1">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            className={cn(
              "shrink-0 px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors",
              active
                ? "border-primary bg-primary/[0.08] text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
