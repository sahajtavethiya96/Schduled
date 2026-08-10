"use client";

import { useState } from "react";
import { cancelBookingAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";

export function BookingCancelButton({
  bookingId,
  hostUserId,
  status,
}: {
  bookingId: string;
  hostUserId: string;
  status: string;
}) {
  const [confirm, setConfirm] = useState(false);

  if (status === "cancelled") {
    return <span className="text-xs text-muted-foreground">Cancelled</span>;
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <form action={cancelBookingAction}>
          <input name="bookingId" type="hidden" value={bookingId} />
          <input name="hostUserId" type="hidden" value={hostUserId} />
          <Button
            className="h-6 px-2 text-xs"
            size="sm"
            type="submit"
            variant="destructive"
          >
            Confirm
          </Button>
        </form>
        <Button
          className="h-6 px-2 text-xs"
          onClick={() => setConfirm(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      className="h-6 px-2 text-xs border-error/40 text-error hover:bg-error/10 hover:text-error"
      onClick={() => setConfirm(true)}
      size="sm"
      type="button"
      variant="outline"
    >
      Cancel
    </Button>
  );
}
