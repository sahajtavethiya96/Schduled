"use client";

import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import { Suspense, useEffect } from "react";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.08 });

function Progress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname/searchParams aren't read in the body — they're the re-run trigger for "route changed"
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      if (anchor.target === "_blank") {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
          return;
        }
        // Same-page navigation — no loading bar needed
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      NProgress.start();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Progress />
    </Suspense>
  );
}
