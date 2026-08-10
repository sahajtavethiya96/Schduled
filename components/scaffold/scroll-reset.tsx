"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollReset() {
  const pathname = usePathname();
  const isFirst = useRef(true);

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
