"use client"

import * as React from "react"
import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle as HeadlessDialogTitle,
  Description,
} from "@headlessui/react"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "@phosphor-icons/react"

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(component: string) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Dialog>`)
  }
  return ctx
}

function Dialog({
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
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogTrigger")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DialogClose({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogClose")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="dialog-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogBackdrop>) {
  return (
    <DialogBackdrop
      data-slot="dialog-overlay"
      transition
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/50 duration-100 data-open:animate-in data-open:fade-in-0 data-leave:animate-out data-leave:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onInteractOutside,
  onEscapeKeyDown,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  /**
   * Headless UI unifies Escape and outside-click dismissal into a single
   * onClose callback, so both fire together here. The only current
   * consumer (delete-account-modal.tsx) treats them identically, so
   * behavior is unaffected in practice.
   */
  onInteractOutside?: (event: { preventDefault: () => void }) => void
  onEscapeKeyDown?: (event: { preventDefault: () => void }) => void
}) {
  const { open, setOpen } = useDialogContext("DialogContent")

  const handleClose = (value: boolean) => {
    if (!value) {
      let prevented = false
      const syntheticEvent = {
        preventDefault: () => {
          prevented = true
        },
      }
      onEscapeKeyDown?.(syntheticEvent)
      if (!prevented) onInteractOutside?.(syntheticEvent)
      if (prevented) return
    }
    setOpen(value)
  }

  return (
    <HeadlessDialog
      data-slot="dialog-portal"
      open={open}
      onClose={handleClose}
      transition
    >
      <DialogOverlay />
      <DialogPanel
        data-slot="dialog-content"
        transition
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-none bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-leave:animate-out data-leave:fade-out-0 data-leave:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4 size-7 text-muted-foreground hover:text-foreground"
            >
              <XIcon size={15} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        )}
      </DialogPanel>
    </HeadlessDialog>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof HeadlessDialogTitle>) {
  return (
    <HeadlessDialogTitle
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold tracking-wider uppercase",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Description>) {
  return (
    <Description
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
