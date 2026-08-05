"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CheckIcon } from "@phosphor-icons/react"

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
        "peer relative flex size-4.5 shrink-0 items-center justify-center rounded-none border border-input bg-transparent transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      {isChecked ? (
        <span
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
        >
          <CheckIcon />
        </span>
      ) : null}
    </button>
  )
}

export { Checkbox }
