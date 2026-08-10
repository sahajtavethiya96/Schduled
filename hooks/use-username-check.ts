"use client";

import { useEffect, useRef, useState } from "react";

export type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export function useUsernameCheck(value: string, currentValue?: string | null) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    const v = value.trim().toLowerCase();

    if (!v) {
      setStatus("idle");
      return;
    }

    // Same as their existing/saved username — no check needed
    if (currentValue && v === currentValue.toLowerCase()) {
      setStatus("available");
      return;
    }

    // Format validation (mirrors server validation)
    if (
      v.length < 3 ||
      v.length > 30 ||
      !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v)
    ) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");

    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/username-check?username=${encodeURIComponent(v)}`
        );
        const data = (await res.json()) as { available: boolean };
        setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [value, currentValue]);

  return status;
}
