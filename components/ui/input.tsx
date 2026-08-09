import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input h-9 w-full min-w-0 rounded-none border border-input px-3 py-2 text-sm text-base-content shadow-none outline-none transition-colors placeholder:text-muted-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-base-content focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
