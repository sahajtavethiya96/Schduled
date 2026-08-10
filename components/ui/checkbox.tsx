"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
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
      role="checkbox"
      aria-checked={isChecked}
      aria-required={required}
      data-slot="checkbox"
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
        "checkbox peer relative flex size-4.5 shrink-0 items-center justify-center rounded-none border border-input bg-transparent transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-error/50 dark:aria-invalid:ring-error/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-content dark:data-checked:bg-primary",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }
