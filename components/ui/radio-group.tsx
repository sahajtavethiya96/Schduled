"use client"

import * as React from "react"
import { RadioGroup as HeadlessRadioGroup, Radio } from "@headlessui/react"

import { cn } from "@/lib/utils"

// Headless UI's RadioGroup natively supports controlled
// `value`/`defaultValue`, plus `name`/`form`/`disabled`, with one naming
// mismatch against this file's public API: its change callback is
// `onChange`, not `onValueChange` — renamed at the boundary here so the
// public API is untouched.
// `Radio`'s render-prop slot has a real `checked` boolean, which Headless
// UI auto-stamps as a literal `data-checked=""` DOM attribute — and unlike
// Tab's `active` slot (see tabs.tsx), there's no meaning collision here:
// "checked" *is* the state this file's existing `data-checked:border-primary`
// styling (via the `data-checked` custom variant defined in
// app/globals.css) already wants, so the current className strings carry
// over completely unchanged.
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
        "group/radio-group-item peer relative flex aspect-square size-4.5 shrink-0 rounded-full border border-input bg-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary",
        className
      )}
      {...props}
    >
      {({ checked }) => (
        <>
          {checked && (
            <span
              data-slot="radio-group-indicator"
              className="flex size-4.5 items-center justify-center"
            >
              <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            </span>
          )}
        </>
      )}
    </Radio>
  )
}

export { RadioGroup, RadioGroupItem }
