"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteUserAction,
  recordImpersonationAction,
  toggleUserBanAction,
} from "@/app/actions/users";
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
import { authClient } from "@/lib/auth-client";

export function UserDetailActions({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  async function handleImpersonate() {
    setImpersonating(true);
    setImpersonateError(null);
    try {
      // Record server-side (requireAdmin + audit) before starting the session, so it can't happen without a trail.
      const recorded = await recordImpersonationAction(userId);
      if ("error" in recorded) {
        setImpersonateError(recorded.error);
        setImpersonating(false);
        return;
      }
      await authClient.admin.impersonateUser({ userId });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("[impersonate]", err);
      setImpersonateError("Impersonation failed. Try again.");
      setImpersonating(false);
    }
  }

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full justify-start text-xs"
            size="sm"
            type="button"
            variant={banned ? "secondary" : "outline"}
          >
            {banned ? "Reactivate Account" : "Suspend Account"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banned ? "Reactivate this account?" : "Suspend this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banned
                ? "The user will be able to sign in and access their account again."
                : "The user will be immediately signed out and unable to access their account until reactivated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const fd = new FormData();
                fd.append("userId", userId);
                fd.append("banned", String(!banned));
                startTransition(() => toggleUserBanAction(fd));
              }}
              variant={banned ? "default" : "destructive"}
            >
              {banned ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        className="w-full justify-start text-xs"
        disabled={impersonating || banned}
        onClick={handleImpersonate}
        size="sm"
        variant="secondary"
      >
        {impersonating ? "Switching…" : "Impersonate User"}
      </Button>

      {impersonateError && (
        <p className="text-xs text-error">{impersonateError}</p>
      )}

      {!banned && (
        <p className="pt-1 text-2xs text-muted-foreground">
          Impersonation opens the app as this user. Use the “Stop impersonating”
          banner at the top to return to your admin session.
        </p>
      )}

      <div className="mt-3 border-t border-error/20 pt-3">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-2xs text-error">
              This permanently deletes the user and all their bookings, event
              types and data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <form action={deleteUserAction} className="flex-1">
                <input name="userId" type="hidden" value={userId} />
                <Button
                  className="w-full text-xs"
                  size="sm"
                  type="submit"
                  variant="destructive"
                >
                  Confirm Delete
                </Button>
              </form>
              <Button
                className="flex-1 text-xs"
                onClick={() => setConfirmDelete(false)}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full justify-start border-error/40 text-xs text-error hover:bg-error/10 hover:text-error"
            onClick={() => setConfirmDelete(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Delete User
          </Button>
        )}
      </div>
    </div>
  );
}
