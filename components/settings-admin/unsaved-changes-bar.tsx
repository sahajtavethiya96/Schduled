"use client";

import { CircleNotch, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Floating "unsaved changes" prompt, shared by every settings page that has
 * inline-editable fields. Must stay visible regardless of scroll position,
 * so it's `fixed` to the viewport (not `sticky` to a container, which
 * vanishes once scrolled past it). Anchored to the bottom-right corner
 * rather than spanning full width, sidestepping the need to track sidebar
 * widths — while clearing the mobile bottom nav
 * (`components/scaffold/mobile-nav.tsx`, h-16) via `bottom-20`.
 */
export function UnsavedChangesBar({
  visible,
  label,
  pending = false,
  onCancel,
  onSave,
}: {
  visible: boolean;
  label: string;
  pending?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className={`fixed bottom-20 right-6 z-30 flex items-center gap-4 border border-base-300 bg-base-100 px-5 py-3 ring-1 ring-foreground/10 transition-all duration-200 ease-out md:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Warning size={15} weight="fill" className="text-amber-500" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button size="sm" className="gap-1.5" disabled={pending} onClick={onSave} type="button">
          {pending ? (
            <><CircleNotch className="animate-spin" size={13} /> Saving…</>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
