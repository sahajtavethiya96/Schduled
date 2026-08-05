"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// A progress bar is just a styled `role="progressbar"` div with a couple
// of derived `aria-value*`/`data-*` attributes — no interaction,
// positioning, or portal behavior to speak of, so there's nothing here
// Headless UI or a hand-rolled hook buys over plain markup.
function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<"div"> & { value?: number | null; max?: number }) {
  const state =
    value == null ? "indeterminate" : value >= max ? "complete" : "loading"

  return (
    <div
      data-slot="progress"
      data-state={state}
      data-value={value ?? undefined}
      data-max={max}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      className={cn(
        "relative flex h-0.5 w-full items-center overflow-x-hidden rounded-none bg-muted",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        data-state={state}
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
}

export { Progress }
