"use client";

import {
  AddressBook,
  CalendarCheck,
  Clock,
  GearSix,
  Lightning,
  SquaresFour,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: SquaresFour },
  { href: "/event-types", label: "Events", icon: Lightning },
  { href: "/availability", label: "Hours", icon: Clock },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/contacts", label: "Contacts", icon: AddressBook },
  { href: "/settings", label: "Settings", icon: GearSix },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href + "/")) ||
          (href === "/settings" && pathname.startsWith("/settings"));
        return (
          <Link
            className={cn(
              "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-2xs font-semibold transition-colors",
              active
                ? "text-primary"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            )}
            href={href}
            key={href}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
