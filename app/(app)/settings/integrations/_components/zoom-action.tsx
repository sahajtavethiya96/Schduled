"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { disconnectZoom } from "@/app/actions/settings";
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

export function ZoomDisconnectButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      const res = await disconnectZoom();
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Zoom disconnected");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={isPending} size="sm" variant="outline">
          Disconnect
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Zoom?</AlertDialogTitle>
          <AlertDialogDescription>
            New bookings will no longer get a Zoom link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-error text-error-content hover:bg-error/90"
            onClick={handleDisconnect}
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
