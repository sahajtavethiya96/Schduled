"use client"

import * as React from "react"
import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle as HeadlessDialogTitle,
  Description,
  TransitionChild,
} from "@headlessui/react"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type AlertDialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null)

function useAlertDialogContext(component: string) {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <AlertDialog>`)
  }
  return ctx
}

// Shares the Cancel button's DOM node with AlertDialogContent so it can be
// passed as Headless UI's `initialFocus`.
const AlertDialogCancelRefContext =
  React.createContext<React.RefObject<HTMLButtonElement | null> | null>(null)

function AlertDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

function AlertDialogTrigger({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useAlertDialogContext("AlertDialogTrigger")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="alert-dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogBackdrop>) {
  return (
    <DialogBackdrop
      data-slot="alert-dialog-overlay"
      transition
      className={cn(
        "fixed inset-0 z-50 bg-black/50 duration-100 data-open:animate-in data-open:fade-in-0 data-leave:animate-out data-leave:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
}) {
  const { open, setOpen } = useAlertDialogContext("AlertDialogContent")
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <HeadlessDialog
      data-slot="alert-dialog-portal"
      open={open}
      onClose={setOpen}
      role="alertdialog"
      initialFocus={cancelRef}
      transition
    >
      {/*
        Outside clicks must never dismiss an alert dialog, only Escape.
        Headless UI has no dedicated prop for this (tracked upstream, still
        open as of writing: github.com/tailwindlabs/headlessui/discussions/1860,
        github.com/tailwindlabs/headlessui/issues/621) and collapses Escape
        and outside-click into a single onClose with no way to tell them
        apart.
        <DialogPanel> is what Headless UI's outside-click detection treats
        as "inside" — per its own docs, "clicking outside of this component
        will trigger the onClose of the Dialog component." Making it span
        the full viewport and nesting both the backdrop and the visible
        content box inside it means nothing is ever "outside" while the
        dialog is open, so that path never fires — while Escape stays on
        its own separate, unconditional keydown handler. This is the
        community-established pattern for this exact gap (see e.g.
        github.com/tailwindlabs/headlessui/issues/621#issuecomment-2333291297
        and #issuecomment-2280014201).
      */}
      <DialogPanel data-slot="alert-dialog-panel" className="fixed inset-0 z-50">
        <AlertDialogOverlay />
        <AlertDialogCancelRefContext.Provider value={cancelRef}>
          <TransitionChild
            as="div"
            data-slot="alert-dialog-content"
            data-size={size}
            className={cn(
              "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-6 rounded-none bg-popover p-6 text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-leave:animate-out data-leave:fade-out-0 data-leave:zoom-out-95",
              className
            )}
            {...props}
          />
        </AlertDialogCancelRefContext.Provider>
      </DialogPanel>
    </HeadlessDialog>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-2 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-none bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof HeadlessDialogTitle>) {
  return (
    <HeadlessDialogTitle
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider uppercase sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Description>) {
  return (
    <Description
      data-slot="alert-dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  const { setOpen } = useAlertDialogContext("AlertDialogAction")

  return (
    <Button
      variant={variant}
      size={size}
      data-slot="alert-dialog-action"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  const { setOpen } = useAlertDialogContext("AlertDialogCancel")
  const cancelRef = React.useContext(AlertDialogCancelRefContext)

  return (
    <Button
      ref={cancelRef}
      variant={variant}
      size={size}
      data-slot="alert-dialog-cancel"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      className={cn(className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
