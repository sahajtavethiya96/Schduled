"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <WarningIcon className="size-4" />
        ),
        error: (
          <XCircleIcon className="size-4" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-base-100)",
          "--normal-text": "var(--color-base-content)",
          "--normal-border": "var(--color-base-300)",
          "--border-radius": "var(--radius-box)",
        } as React.CSSProperties
      }
      toastOptions={{
        // sonner's own stylesheet sets background/border/color/radius via
        // `[data-sonner-toast][data-styled=true]`, which outranks a plain
        // Tailwind utility class — `!` (important) is required to win here.
        classNames: {
          toast: "!rounded-none",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-content rounded-none",
          cancelButton: "bg-base-200 text-muted-foreground rounded-none",
          default: "!border-base-300 !bg-base-100 !text-base-content",
          loading: "!border-base-300 !bg-base-100 !text-base-content",
          success: "!border-success/40 !bg-success-subtle !text-success-content",
          error: "!border-error/40 !bg-error/10 !text-error",
          warning: "!border-warning/40 !bg-warning/15 !text-base-content",
          info: "!border-primary/40 !bg-primary/10 !text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
