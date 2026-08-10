"use client";

import { MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleEmailVerification } from "@/app/actions/security";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface EventTypeRow {
  color: string;
  id: string;
  locationType: string;
  name: string;
  requiresEmailVerification: boolean;
  updatedAt: Date;
}

const LOCATION_LABEL: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  phone_host_calls: "Phone (host calls)",
  phone_invitee_calls: "Phone (invitee calls)",
  in_person: "In Person",
  custom: "Custom",
  invitees_choice: "Invitee's Choice",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BookingVerificationCard({
  eventTypes,
}: {
  eventTypes: EventTypeRow[];
}) {
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(
      eventTypes.map((e) => [e.id, e.requiresEmailVerification])
    )
  );
  const [, startTransition] = useTransition();

  const filtered = eventTypes.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleToggle(id: string, value: boolean) {
    setStates((prev) => ({ ...prev, [id]: value }));
    startTransition(async () => {
      const res = await toggleEmailVerification(id, value);
      if ("error" in res) {
        toast.error(res.error);
        setStates((prev) => ({ ...prev, [id]: !value }));
      } else {
        toast.success(
          value
            ? "Email verification required"
            : "Email verification no longer required"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={18} />
          <CardTitle>Booking Verification</CardTitle>
        </div>
        <CardDescription>
          When enabled, invitees must verify their email address before a
          booking is confirmed. This reduces no-shows and fake bookings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
          />
          <input
            className="w-full border border-input bg-base-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60 max-w-xs"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meeting types…"
            type="search"
            value={query}
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No meeting types found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="border border-base-300 min-w-[560px]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_140px_140px] gap-4 border-b border-base-300 bg-base-200/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Name</span>
                <span>Verification</span>
                <span>Location</span>
                <span>Last edited</span>
              </div>

              {/* Rows */}
              {filtered.map((et) => (
                <div
                  className="grid grid-cols-[1fr_120px_140px_140px] gap-4 border-b border-base-300 last:border-b-0 px-4 py-3 items-center hover:bg-base-200/20 transition-colors"
                  key={et.id}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0"
                      style={{ backgroundColor: et.color }}
                    />
                    <span className="truncate text-sm font-medium">
                      {et.name}
                    </span>
                  </div>
                  <div>
                    <Switch
                      checked={states[et.id] ?? false}
                      onCheckedChange={(v) => handleToggle(et.id, v)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {LOCATION_LABEL[et.locationType] ?? et.locationType}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(et.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
