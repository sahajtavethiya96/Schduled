"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error"

const AvatarStatusContext = React.createContext<{
  status: ImageLoadingStatus
  setStatus: (status: ImageLoadingStatus) => void
} | null>(null)

function Avatar({
  className,
  size = "default",
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg"
  ref?: React.Ref<HTMLDivElement>
}) {
  const [status, setStatus] = React.useState<ImageLoadingStatus>("idle")

  return (
    <AvatarStatusContext.Provider value={{ status, setStatus }}>
      <div
        ref={ref}
        data-slot="avatar"
        data-size={size}
        className={cn(
          "avatar group/avatar flex size-8 shrink-0 rounded-none select-none after:absolute after:inset-0 after:rounded-none after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
          className
        )}
        {...props}
      />
    </AvatarStatusContext.Provider>
  )
}

function AvatarImage({
  className,
  onLoad,
  onError,
  ref,
  ...props
}: React.ComponentProps<"img"> & { ref?: React.Ref<HTMLImageElement> }) {
  const ctx = React.useContext(AvatarStatusContext)

  React.useEffect(() => {
    ctx?.setStatus("loading")
    return () => ctx?.setStatus("idle")
  }, [props.src])

  if (ctx?.status === "error") return null

  return (
    <img
      ref={ref}
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-none object-cover", className)}
      onLoad={(event) => {
        ctx?.setStatus("loaded")
        onLoad?.(event)
      }}
      onError={(event) => {
        ctx?.setStatus("error")
        onError?.(event)
      }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ref,
  ...props
}: React.ComponentProps<"div"> & { ref?: React.Ref<HTMLDivElement> }) {
  const ctx = React.useContext(AvatarStatusContext)

  if (ctx?.status === "loaded") return null

  return (
    <div
      ref={ref}
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-none bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-none bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-none bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
