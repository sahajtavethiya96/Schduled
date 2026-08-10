import * as React from "react"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"

const buttonBase =
  "btn group/button rounded-none border border-transparent bg-clip-padding text-xs tracking-widest whitespace-nowrap uppercase transition-all outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 dark:aria-invalid:border-error/50 dark:aria-invalid:ring-error/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"

const buttonVariantClasses = {
  default: "btn-primary",
  outline:
    "btn-outline border-base-300 aria-expanded:bg-base-200 aria-expanded:text-base-content",
  secondary:
    "btn-secondary aria-expanded:bg-secondary aria-expanded:text-secondary-content",
  ghost: "btn-ghost aria-expanded:bg-base-200 aria-expanded:text-base-content",
  destructive:
    "btn-error focus-visible:border-error/60 focus-visible:ring-error/30",
  link: "btn-link",
} as const

const buttonSizeClasses = {
  default:
    "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
  xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
  lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
  icon: "btn-square size-10",
  "icon-xs": "btn-square size-7 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "btn-square size-9",
  "icon-lg": "btn-square size-11",
} as const

type ButtonVariant = keyof typeof buttonVariantClasses
type ButtonSize = keyof typeof buttonSizeClasses

function buttonVariants({
  variant = "default",
  size,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
} = {}) {
  return cn(
    buttonBase,
    buttonVariantClasses[variant],
    size ? buttonSizeClasses[size] : undefined
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
