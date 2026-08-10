"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Full navigation (not router.push) so GuidedTour re-mounts and re-reads localStorage.
export function RestartTourButton({ userId }: { userId: string }) {
  function restart() {
    try {
      localStorage.removeItem(`schduled:tour:${userId}`);
    } catch {}
    window.location.href = "/dashboard";
  }

  return (
    <Button className="gap-1.5" onClick={restart} size="sm" variant="outline">
      <ArrowsClockwise size={14} />
      Replay product tour
    </Button>
  );
}
