"use client";

import { ArrowRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type IntegrationCardStatus =
  | "configured"
  | "not-configured"
  | "restart-required";

const STATUS_LABEL: Record<IntegrationCardStatus, string> = {
  configured: "Configured",
  "not-configured": "Not configured",
  "restart-required": "Restart required",
};

const STATUS_CLASSES: Record<IntegrationCardStatus, string> = {
  configured: "border-success/25 bg-success/10 text-success",
  "not-configured": "border-destructive/25 bg-destructive/10 text-destructive",
  "restart-required":
    "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-500",
};

const STATUS_DOT_CLASSES: Record<IntegrationCardStatus, string> = {
  configured: "bg-success",
  "not-configured": "bg-destructive",
  "restart-required": "bg-amber-500",
};

interface Props {
  /** The full settings form, rendered inside the dialog on demand so it
   * isn't mounted until the card is actually opened. */
  children: ReactNode;
  description: string;
  icon: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  status: IntegrationCardStatus;
  title: string;
}

/** Compact summary card for a service integration, with a dialog that
 * lazily mounts the matching *SettingsForm — used by the setup wizard's
 * "Configure services" step, which needs a glanceable list rather than four
 * long inline forms competing for space in a single wizard card. The full
 * admin page (/settings/services) renders the same forms inline instead. */
export function IntegrationConfigCard({
  icon,
  title,
  description,
  status,
  open,
  onOpenChange,
  children,
}: Props) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <div className="flex items-center gap-3 border border-border p-3">
        <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold",
                STATUS_CLASSES[status]
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  STATUS_DOT_CLASSES[status]
                )}
              />
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          onClick={() => onOpenChange(true)}
          type="button"
        >
          {status === "not-configured" ? "Configure" : "Edit"}
          <ArrowRight size={14} />
        </button>
      </div>

      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && children}
      </DialogContent>
    </Dialog>
  );
}
