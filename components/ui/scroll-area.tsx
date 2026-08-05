"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// The standard CSS `scrollbar-width`/`scrollbar-color` properties (widely
// supported since ~2023) plus a `::-webkit-scrollbar` fallback for older
// Chromium/Safari give a "thin, tinted, consistent" scrollbar look with
// zero JS — real native scrolling (momentum, keyboard, touch, a11y) with
// custom paint, instead of faked scrolling. `ScrollBar` is kept as a no-op
// passthrough purely for API-surface parity (same precedent as
// SelectScrollUpButton/SelectScrollDownButton in select.tsx) — the
// viewport now styles its own scrollbar directly, so there's no separate
// scrollbar element to compose.
const scrollbarClassName = cn(
  "[scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]",
  "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:bg-clip-padding"
)

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-area" className={cn("relative", className)} {...props}>
      <div
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full overflow-auto rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          scrollbarClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

function ScrollBar(
  _props: React.ComponentProps<"div"> & {
    orientation?: "vertical" | "horizontal"
  }
) {
  return null
}

export { ScrollArea, ScrollBar }
