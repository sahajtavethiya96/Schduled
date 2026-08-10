"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// CSS `scrollbar-width`/`scrollbar-color` plus a `::-webkit-scrollbar`
// fallback give a thin, tinted scrollbar with real native scrolling and
// zero JS. `ScrollBar` is kept as a no-op passthrough for API-surface
// parity — the viewport styles its own scrollbar directly.
const scrollbarClassName = cn(
  "[scrollbar-width:thin] [scrollbar-color:var(--color-base-300)_transparent]",
  "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-base-300 [&::-webkit-scrollbar-thumb]:bg-clip-padding"
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
          "size-full overflow-auto rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-primary/50 focus-visible:outline-1",
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
