"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  const isNavRef = useRef(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (doneTimer.current) {
      clearTimeout(doneTimer.current);
      doneTimer.current = null;
    }
  }, []);

  const endNav = useCallback(() => {
    if (!isNavRef.current) {
      return;
    }
    isNavRef.current = false;
    clearTimers();
    setPhase("done");
    doneTimer.current = setTimeout(() => setPhase("idle"), 380);
  }, [clearTimers]);

  const startNav = useCallback(() => {
    clearTimers();
    isNavRef.current = true;
    setPhase("loading");
  }, [clearTimers]);

  // End the loader when pathname/searchParams actually change (navigation complete)
  useEffect(() => {
    endNav();
  }, [pathname, searchParams, endNav]);

  // Patch history.pushState + history.replaceState to catch ALL navigations:
  // <Link> clicks, router.push(), router.replace(), and any other programmatic navigation.
  // Keep a popstate listener for browser back/forward (those don't go through pushState).
  useEffect(() => {
    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    function maybeStart(url: string | URL | null | undefined) {
      if (!url) {
        return;
      }
      try {
        const next = new URL(String(url), window.location.href);
        if (next.origin !== window.location.origin) {
          return;
        }
        if (
          next.pathname === window.location.pathname &&
          next.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      startNav();
    }

    window.history.pushState = (state, unused, url) => {
      origPush(state, unused, url);
      // Defer setState — pushState is called inside React's useInsertionEffect
      // during App Router commits; calling setState synchronously there throws.
      setTimeout(() => maybeStart(url), 0);
    };

    window.history.replaceState = (state, unused, url) => {
      origReplace(state, unused, url);
      setTimeout(() => maybeStart(url), 0);
    };

    function onPopState() {
      startNav();
    }

    window.addEventListener("popstate", onPopState);

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, [startNav, clearTimers]);

  if (phase === "idle") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: "3px" }}
    >
      <div
        className="grl-bar-fill h-full w-full"
        data-done={phase === "done" ? "" : undefined}
      />
      <div aria-hidden="true" className="grl-bar-glow absolute inset-0" />
    </div>
  );
}

export function GlobalRouteLoader() {
  return (
    <Suspense fallback={null}>
      <RouteLoader />
    </Suspense>
  );
}
