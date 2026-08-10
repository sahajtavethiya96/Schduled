"use client";

import { useTransition } from "react";
import { toggleUserBanAction } from "@/app/actions/users";
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
import { Button } from "@/components/ui/button";

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
        className="text-xs h-7"
        disabled={isPending}
        onClick={run}
        size="sm"
        type="button"
        variant="secondary"
      >
        {isPending ? "Reactivating…" : "Reactivate"}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="text-xs h-7"
          disabled={isPending}
          size="sm"
          type="button"
          variant="outline"
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
            disabled={isPending}
            onClick={run}
          >
            {isPending ? "Suspending…" : "Suspend"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
