"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  ref,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange" | "value"> & {
  size?: "sm" | "default"
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  required?: boolean
  name?: string
  value?: string
  ref?: React.Ref<HTMLButtonElement>
}) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(
    defaultChecked ?? false
  )
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : uncontrolledChecked

  function toggle() {
    if (disabled) return
    const next = !isChecked
    if (!isControlled) setUncontrolledChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-required={required}
      data-slot="switch"
      data-size={size}
      data-state={isChecked ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      disabled={disabled}
      name={name}
      value={value}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) toggle()
      }}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-sm border transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=default]:h-4.5 data-[size=default]:w-8.25 data-[size=sm]:h-3.5 data-[size=sm]:w-6.25 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-unchecked:border-input/50 data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-sm bg-background ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-2.5 data-checked:translate-x-[calc(100%+2px)] dark:data-checked:bg-primary-foreground data-unchecked:translate-x-0.25 dark:data-unchecked:bg-foreground"
        data-state={isChecked ? "checked" : "unchecked"}
      />
    </button>
  )
}

export { Switch }
