"use client";

import { CheckCircle, Globe, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUserTimezone } from "@/app/actions/availability";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn, normalizeTzName } from "@/lib/utils";

const COMMON_TZ = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const ALL_TZ: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return COMMON_TZ;
  }
})();

function getTzLabel(tz: string) {
  try {
    const offset =
      new Intl.DateTimeFormat("en", { timeZoneName: "short", timeZone: tz })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    return `(${offset}) ${normalizeTzName(tz)}`;
  } catch {
    return normalizeTzName(tz);
  }
}

// This is your own account timezone — it's what your dashboard, bookings
// list, and availability hours are shown in. It's separate from the
// timezone an invitee sees on your public booking page, which is detected
// from their browser (with a manual override) — see the Availability page.
export function TimezoneCard({ timezone }: { timezone: string }) {
  const [currentTz, setCurrentTz] = useState(timezone);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTz = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return COMMON_TZ;
    }
    const inCommon = COMMON_TZ.filter(
      (tz) =>
        tz.toLowerCase().includes(q) || getTzLabel(tz).toLowerCase().includes(q)
    );
    if (inCommon.length > 0) {
      return inCommon;
    }
    return ALL_TZ.filter(
      (tz) =>
        tz.toLowerCase().includes(q) || getTzLabel(tz).toLowerCase().includes(q)
    ).slice(0, 50);
  }, [search]);

  function handleChange(tz: string) {
    startTransition(async () => {
      const res = await updateUserTimezone(tz);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setCurrentTz(tz);
      setDialogOpen(false);
      setSearch("");
      toast.success("Timezone updated");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timezone</CardTitle>
        <CardDescription>
          Your dashboard, bookings, and availability hours are shown in this
          timezone. Invitees booking with you see times in their own browser's
          timezone instead — this only affects your view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="shrink-0 text-muted-foreground" size={16} />
            <span className="font-medium text-foreground">
              {getTzLabel(currentTz)}
            </span>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Change
          </Button>
        </div>
      </CardContent>

      <Dialog
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSearch("");
          }
        }}
        open={dialogOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Change timezone</DialogTitle>
          <DialogDescription className="sr-only">
            Select your timezone
          </DialogDescription>
          <div className="space-y-3">
            <div className="relative">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="h-9 pl-9"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search timezones…"
                value={search}
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-border">
              {filteredTz.map((tz) => (
                <button
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    tz === currentTz && "bg-primary/10 font-medium text-primary"
                  )}
                  disabled={isPending}
                  key={tz}
                  onClick={() => handleChange(tz)}
                  type="button"
                >
                  <span>{getTzLabel(tz)}</span>
                  {tz === currentTz && <CheckCircle size={14} weight="fill" />}
                </button>
              ))}
              {filteredTz.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No matches
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
