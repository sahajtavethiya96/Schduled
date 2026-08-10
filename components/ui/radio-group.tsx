"use client"

import * as React from "react"
import { RadioGroup as HeadlessRadioGroup, Radio } from "@headlessui/react"

import { cn } from "@/lib/utils"

// Headless UI's change callback is `onChange`, renamed to `onValueChange`
// here to match this file's public API. `Radio`'s auto-stamped
// `data-checked=""` attribute (unlike Tab's `active` slot in tabs.tsx) has
// no meaning collision, so the existing `data-checked:border-primary`
// styling works unchanged.
function RadioGroup({
  className,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof HeadlessRadioGroup<"div", string>>,
  "onChange"
> & {
  onValueChange?: (value: string) => void
}) {
  return (
    <HeadlessRadioGroup
      data-slot="radio-group"
      onChange={onValueChange}
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof Radio>) {
  return (
    <Radio
      data-slot="radio-group-item"
      className={cn(
        "radio radio-primary group/radio-group-item peer relative flex aspect-square size-4.5 shrink-0 rounded-full border border-input bg-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-error/50 dark:aria-invalid:ring-error/40 data-checked:border-primary",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
