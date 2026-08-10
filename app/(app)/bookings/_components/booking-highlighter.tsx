"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Scrolls to and briefly highlights the booking row referenced by ?highlight=
 * (e.g. when arriving from a notification). No-ops if the row isn't on the
 * current tab/page.
 */
export function BookingHighlighter() {
  const params = useSearchParams();
  const highlight = params.get("highlight");

  useEffect(() => {
    if (!highlight) {
      return;
    }
    const el = document.getElementById(`booking-${highlight}`);
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary");
    const timer = setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary");
    }, 2500);
    return () => clearTimeout(timer);
  }, [highlight]);

  return null;
}
