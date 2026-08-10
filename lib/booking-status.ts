export const STATUS_STYLES: Record<
  string,
  { dotClass: string; badge: string; label: string }
> = {
  confirmed: {
    dotClass: "bg-primary",
    badge: "bg-primary/10 text-primary",
    label: "Confirmed",
  },
  cancelled: {
    dotClass: "bg-destructive",
    badge: "bg-destructive/10 text-destructive",
    label: "Cancelled",
  },
  pending: {
    dotClass: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700",
    label: "Pending",
  },
  reschedule_requested: {
    dotClass: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700",
    label: "Reschedule Requested",
  },
  rescheduled: {
    dotClass: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700",
    label: "Rescheduled",
  },
  no_show: {
    dotClass: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    label: "No show",
  },
  completed: {
    dotClass: "bg-foreground/30",
    badge: "bg-foreground/5 text-muted-foreground",
    label: "Completed",
  },
};
