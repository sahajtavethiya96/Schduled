"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AddressBook,
  CalendarCheck,
  CalendarPlus,
  Clock,
  GearSix,
  SignOut,
  SquaresFour,
  UserCircle,
} from "@phosphor-icons/react";
import { logoutAction } from "@/app/actions/auth";
import { useAvatar } from "@/components/avatar-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

const NAV_LINKS: { href: string; label: string; icon: IconComponent; tourId?: string }[] = [
  { href: "/dashboard",    label: "Dashboard",   icon: SquaresFour },
  { href: "/event-types",  label: "Meeting Types", icon: CalendarPlus, tourId: "meeting-types" },
  { href: "/availability", label: "Availability", icon: Clock, tourId: "availability" },
  { href: "/bookings",     label: "Bookings",    icon: CalendarCheck, tourId: "bookings" },
  { href: "/contacts",     label: "Contacts",    icon: AddressBook },
  { href: "/settings",     label: "Settings",    icon: GearSix     },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  tourId,
}: {
  href: string;
  label: string;
  icon: IconComponent;
  active: boolean;
  tourId?: string;
}) {
  return (
    <Link
      href={href}
      data-tour={tourId}
      data-sidebar-nav-item
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-none border-l-[3px]",
        active
          ? "border-l-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-l-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        "data-[tour-dim=true]:!bg-transparent data-[tour-dim=true]:!border-l-transparent data-[tour-dim=true]:!text-sidebar-foreground/25",
      )}
    >
      <Icon size={17} weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export function SidebarNav({
  email,
  userName,
  isAdmin,
  userImage,
}: {
  email: string;
  userName?: string | null;
  isAdmin: boolean;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const { url: avatarUrl } = useAvatar();

  return (
    <div className="flex h-full flex-col">

      {/* ── Logo — same height as top bar so it aligns visually ──────── */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 text-white">
        <Logo href="/dashboard" size="md" variant="full" />
      </div>

      {/* ── Main nav ─────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar px-2 py-3">
        {NAV_LINKS.map(({ href, label, icon, tourId }) => {
          const isProfileSection =
            pathname.startsWith("/profile/profile") ||
            pathname.startsWith("/profile/security") ||
            pathname.startsWith("/profile/login")
          const active =
            href === "/settings"
              ? pathname.startsWith("/settings") && !isProfileSection
              : pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href + "/"))
          return (
            <NavItem key={href} href={href} label={label} icon={icon} active={active} tourId={tourId} />
          )
        })}
      </nav>

      {/* ── Bottom section ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2 space-y-0.5">

        {/* Profile link */}
        <NavItem
          href="/profile/profile"
          label="Profile"
          icon={UserCircle}
          active={
            pathname.startsWith("/profile/profile") ||
            pathname.startsWith("/profile/security") ||
            pathname.startsWith("/profile/login")
          }
        />

        {/* Sign out */}
        <form action={logoutAction.bind(null, "/login")}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/40 hover:text-destructive"
          >
            <SignOut size={17} />
            Sign out
          </button>
        </form>

        {/* User info row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 mt-1 border-t border-sidebar-border/50"
          title={email}
        >
          {/* key remounts on URL change so the placeholder shows after the
              photo is removed (avoids a stale "loaded" status carrying over). */}
          <Avatar key={avatarUrl ?? "placeholder"}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile" /> : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <UserCircle size={22} />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground leading-none">
              {userName ?? email}
            </p>
            <p className="mt-0.5 text-xs text-sidebar-foreground/50 leading-none">
              {isAdmin ? "Admin" : "Member"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
