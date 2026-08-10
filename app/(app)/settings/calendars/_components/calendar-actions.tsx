"use client";

import {
  ArrowsClockwise,
  CheckCircle,
  GoogleLogo,
  XCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { disconnectCalendar } from "@/app/actions/settings";
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

interface CalendarRow {
  accountEmail: string;
  calendarName: string | null;
  createdAt: string;
  id: string;
  isConflictCheck: boolean;
  isPrimary: boolean;
  isWriteTarget: boolean;
  provider: string;
  status: string;
}

interface CalendarActionsProps {
  calendar: CalendarRow;
  connectUrl: string;
}

export function CalendarActions({
  calendar,
  connectUrl,
}: CalendarActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isConnected = calendar.status === "connected";

  function handleDisconnect() {
    startTransition(async () => {
      const res = await disconnectCalendar(calendar.id);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Calendar disconnected");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {/* Provider icon */}
      <div className="flex size-10 shrink-0 items-center justify-center bg-base-200">
        <GoogleLogo className="text-base-content" size={20} weight="bold" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{calendar.accountEmail}</p>
        <p className="text-sm text-muted-foreground">
          {calendar.calendarName ?? "Google Calendar"}
          {calendar.isWriteTarget && " · write target"}
          {calendar.isConflictCheck && " · conflict check"}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isConnected ? (
          <CheckCircle
            className="text-success-content"
            size={16}
            weight="fill"
          />
        ) : (
          <XCircle className="text-error" size={16} weight="fill" />
        )}
        <span
          className={`text-xs font-medium ${isConnected ? "text-success-content" : "text-error"}`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Actions */}
      {isConnected ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isPending} size="sm" variant="outline">
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect this calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                Bookings will no longer be written to it, and it won&apos;t be
                used for conflict checks.
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
      ) : (
        <Button asChild size="sm" variant="outline">
          <a href={connectUrl}>
            <ArrowsClockwise size={14} />
            Reconnect
          </a>
        </Button>
      )}
    </div>
  );
}
