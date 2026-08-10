"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Clears the saved tour-completion flag and reloads on the dashboard so the
 * GuidedTour shows again from step 1. Full navigation (not router.push) is
 * required so the tour component re-mounts and re-reads localStorage.
 */
export function RestartTourButton({ userId }: { userId: string }) {
  function restart() {
    try {
      localStorage.removeItem(`schduled:tour:${userId}`);
    } catch {
      // ignore
    }
    window.location.href = "/dashboard";
  }

  return (
    <Button className="gap-1.5" onClick={restart} size="sm" variant="outline">
      <ArrowsClockwise size={14} />
      Replay product tour
    </Button>
  );
}
