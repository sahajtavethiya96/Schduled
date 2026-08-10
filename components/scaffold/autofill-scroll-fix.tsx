"use client";

import { useEffect } from "react";

// Chrome tracks native popups (autofill, <select>) against window scroll only,
// but this app scrolls inside [data-app-main] — so popups drift from their
// field instead of following it. Blurring on scroll closes them cleanly.
export function AutofillScrollFix() {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    if (!main) {
      return;
    }

    function onScroll() {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement
      ) {
        active.blur();
      }
    }

    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
