"use client";

import { useTransition } from "react";
import { toggleUserBanAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UserSuspendForm({
  banned,
  userId,
}: {
  banned: boolean;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function run() {
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("banned", String(!banned));
    startTransition(() => toggleUserBanAction(fd));
  }

  // Reactivate is non-destructive — run immediately. Suspend asks to confirm.
  if (banned) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="text-xs h-7"
        onClick={run}
        disabled={isPending}
      >
        {isPending ? "Reactivating…" : "Reactivate"}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-7"
          disabled={isPending}
        >
          Suspend
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend this account?</AlertDialogTitle>
          <AlertDialogDescription>
            The user will be signed out immediately and blocked from logging in
            until you reactivate them. This can be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-error text-error-content hover:bg-error/90"
            onClick={run}
            disabled={isPending}
          >
            {isPending ? "Suspending…" : "Suspend"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
