"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// A native <progress> element already carries the progressbar role and
// derives aria-valuemin/max/now from its own value/max attributes, so
// there's nothing left here for Headless UI or a hand-rolled hook to add.
function Progress({
  className,
  value,
  max = 100,
  ...props
}: Omit<React.ComponentProps<"progress">, "value" | "max"> & {
  value?: number | null
  max?: number
}) {
  return (
    <progress
      data-slot="progress"
      className={cn("progress progress-primary w-full", className)}
      value={value ?? undefined}
      max={max}
      {...props}
    />
  )
}

export { Progress }
