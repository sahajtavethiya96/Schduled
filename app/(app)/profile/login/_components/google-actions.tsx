"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

interface GoogleActionsProps {
  canDisconnect: boolean;
  hasGoogle: boolean;
}

export function GoogleActions({
  hasGoogle,
  canDisconnect,
}: GoogleActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/profile/login",
      });
      if (result?.data?.url) {
        window.location.href = result.data.url;
        return;
      }
    } catch {
      toast.error("Failed to start Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const result = await authClient.unlinkAccount({ providerId: "google" });
      if (result?.error) {
        toast.error(result.error.message ?? "Failed to disconnect Google.");
        setLoading(false);
        return;
      }
      toast.success("Google account disconnected.");
      router.refresh();
    } catch {
      toast.error("Failed to disconnect Google. Please try again.");
      setLoading(false);
    }
  }

  if (!hasGoogle) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={loading} size="sm">
            {loading ? "Redirecting…" : "Connect"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connect Google?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to Google to authorise access. Once
              connected, you can sign in to Schduled using your Google account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConnect}>
              Continue to Google
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (!canDisconnect) {
    return (
      <span className="text-xs text-muted-foreground">
        Only method — cannot remove
      </span>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={loading} size="sm" variant="outline">
          {loading ? "Disconnecting…" : "Disconnect"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Google?</AlertDialogTitle>
          <AlertDialogDescription>
            You will no longer be able to sign in with Google. You can reconnect
            at any time — magic link sign-in will still work.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDisconnect} variant="destructive">
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
