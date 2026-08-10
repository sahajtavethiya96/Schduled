"use client";

import { useEffect } from "react";

// Chrome positions native popups (autofill/password suggestions, <select>
// dropdowns) against the focused field and only tracks/closes them on window
// scroll — not on scroll of an inner container. Since the app scrolls inside
// [data-app-main] rather than the window, those popups stay pinned at their
// original screen position while the field moves underneath, making them
// appear to drift. Blurring the field on scroll closes the popup cleanly.
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
