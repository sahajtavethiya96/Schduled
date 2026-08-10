"use client";

import { useState } from "react";
import { deleteEventTypeAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";

export function EventTypeDeleteButton({
  eventTypeId,
  hostUserId,
}: {
  eventTypeId: string;
  hostUserId: string;
}) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <form action={deleteEventTypeAction}>
          <input name="eventTypeId" type="hidden" value={eventTypeId} />
          <input name="hostUserId" type="hidden" value={hostUserId} />
          <Button
            className="h-6 px-2 text-xs"
            size="sm"
            type="submit"
            variant="destructive"
          >
            Confirm Delete
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
      Delete
    </Button>
  );
}
