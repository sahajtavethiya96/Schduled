"use client";

import { useEffect, useState } from "react";

/**
 * Returns the browser's actual origin for display/copy purposes (booking
 * links, QR codes, live previews). Never sourced from a NEXT_PUBLIC_ env var
 * — Next.js inlines those at build time, so a value baked into a Docker
 * image would stay wrong for every deploy that reuses the image on a
 * different domain. window.location.origin is always correct instead.
 * Starts empty to match the server-rendered/pre-hydration pass, then swaps
 * in on mount to avoid a hydration mismatch.
 */
export function useAppOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return origin;
}
