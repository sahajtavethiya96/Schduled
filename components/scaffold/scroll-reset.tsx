"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollReset() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname isn't read in the body — it's the re-run trigger for "route changed"
  useEffect(() => {
    // Skip the very first mount — the page is at the right position already.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    main?.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
