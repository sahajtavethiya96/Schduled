"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SearchEntry = {
  href: string;
  label: string;
  group: string;
  keywords: string;
};

const WORKSPACE_ENTRIES: SearchEntry[] = [
  {
    href: "/settings/my-link",
    label: "Booking Link",
    group: "Workspace",
    keywords: "booking link url slug page",
  },
  {
    href: "/settings/calendars",
    label: "Calendar Sync",
    group: "Workspace",
    keywords: "calendar google sync availability",
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    group: "Workspace",
    keywords: "zoom google video meeting connect",
  },
  {
    href: "/settings/communication",
    label: "Notifications",
    group: "Workspace",
    keywords: "email notifications alerts reminders",
  },
  {
    href: "/settings/contacts",
    label: "Contact settings",
    group: "Workspace",
    keywords: "contacts crm",
  },
  {
    href: "/settings/cookies",
    label: "Cookies",
    group: "Workspace",
    keywords: "cookies privacy gdpr consent",
  },
];

// "Members" (/settings/users) is intentionally omitted — see the matching
// note in settings-nav.tsx. Re-add once teams/invites ship.
const ADMIN_ENTRIES: SearchEntry[] = [
  {
    href: "/settings/services",
    label: "Integration Configuration",
    group: "Platform",
    keywords:
      "smtp email google oauth zoom storage s3 r2 integrations config credentials services",
  },
  {
    href: "/settings/authentication",
    label: "Authentication",
    group: "Platform",
    keywords: "sign in login password magic link google oauth auth",
  },
  {
    href: "/settings/branding",
    label: "Branding",
    group: "Platform",
    keywords: "branding logo name color email white label white-label",
  },
  {
    href: "/settings/platform",
    label: "System Status",
    group: "Platform",
    keywords:
      "smtp email health integrations security general environment app secret encryption zoom database",
  },
  {
    href: "/settings/audit",
    label: "Audit Logs",
    group: "Administration",
    keywords: "audit logs history activity timeline",
  },
  {
    href: "/settings/jobs",
    label: "Background Jobs",
    group: "Administration",
    keywords: "jobs queue email outbox background pg-boss",
  },
];

export function SettingsSearch({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const entries = useMemo(
    () =>
      isAdmin ? [...WORKSPACE_ENTRIES, ...ADMIN_ENTRIES] : WORKSPACE_ENTRIES,
    [isAdmin]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.keywords.includes(q)
    );
  }, [entries, query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Popover onOpenChange={setOpen} open={open && results.length > 0}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MagnifyingGlass
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
          />
          <Input
            className="h-9 pl-8 text-sm"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search settings…"
            value={query}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {results.map((r) => (
          <button
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
              "hover:bg-muted"
            )}
            key={r.href}
            onClick={() => go(r.href)}
            type="button"
          >
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground/70">
              {r.group}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
