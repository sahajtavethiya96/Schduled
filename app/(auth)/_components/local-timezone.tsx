"use client";

import { useEffect, useState } from "react";

function cityFromZone(zone: string) {
  const city = zone.split("/").pop() ?? zone;
  return city.replace(/_/g, " ");
}

export function LocalTimezone({
  fallback = "Asia/Kolkata",
}: {
  fallback?: string;
}) {
  const [zone, setZone] = useState(fallback);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setZone(detected);
      }
    } catch {
      /* keep fallback */
    }
  }, []);

  return <>{cityFromZone(zone)}</>;
}
