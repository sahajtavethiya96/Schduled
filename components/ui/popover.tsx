"use client"

import * as React from "react"
import {
  useFloating,
  useDismiss,
  useRole,
  useInteractions,
  useTransitionStatus,
  useMergeRefs,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
  autoUpdate,
  type Placement,
} from "@floating-ui/react"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  referenceElement: HTMLElement | null
  setReferenceElement: (el: HTMLElement | null) => void
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext(component: string) {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Popover>`)
  }
  return ctx
}

function Popover({
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
  const [referenceElement, setReferenceElement] =
    React.useState<HTMLElement | null>(null)

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <PopoverContext.Provider
      value={{ open, setOpen, referenceElement, setReferenceElement }}
    >
      {children}
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, setOpen, setReferenceElement } =
    usePopoverContext("PopoverTrigger")
  const Comp = asChild ? Slot : "button"
  const ref = useMergeRefs([setReferenceElement])

  return (
    <Comp
      ref={ref}
      data-slot="popover-trigger"
      data-state={open ? "open" : "closed"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      {...props}
    />
  )
}

// If both PopoverAnchor and PopoverTrigger are rendered at once, whichever
// mounts last wins the shared reference.
function PopoverAnchor({
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const { setReferenceElement } = usePopoverContext("PopoverAnchor")
  const Comp = asChild ? Slot : "div"
  const ref = useMergeRefs([setReferenceElement])

  return <Comp ref={ref} data-slot="popover-anchor" {...props} />
}

function toPlacement(
  side: "top" | "right" | "bottom" | "left",
  align: "start" | "center" | "end"
): Placement {
  if (align === "center") return side
  return `${side}-${align}`
}

function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  collisionPadding = 8,
  container,
  onOpenAutoFocus,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  collisionPadding?: number
  container?: Element | null
  // Preventable so combobox-style consumers can keep focus in their own
  // <input> via `onOpenAutoFocus={(e) => e.preventDefault()}`. Maps
  // internally to Floating UI's `initialFocus={-1}` escape hatch on
  // FloatingFocusManager (its documented way to skip auto-focus).
  onOpenAutoFocus?: (event: { preventDefault: () => void }) => void
}) {
  const { open, setOpen, referenceElement } = usePopoverContext("PopoverContent")

  const placement = toPlacement(side, align)
  const { refs, x, y, strategy, isPositioned, context, placement: resolvedPlacement } =
    useFloating({
      open,
      onOpenChange: setOpen,
      placement,
      middleware: [
        offset(sideOffset),
        flip({ padding: collisionPadding }),
        shift({ padding: collisionPadding }),
      ],
      whileElementsMounted: autoUpdate,
      elements: { reference: referenceElement },
    })

  const dismiss = useDismiss(context, { outsidePressEvent: "pointerdown" })
  const role = useRole(context)
  const { getFloatingProps } = useInteractions([dismiss, role])

  const { isMounted, status } = useTransitionStatus(context, { duration: 100 })

  let preventedAutoFocus = false
  if (onOpenAutoFocus) {
    onOpenAutoFocus({
      preventDefault: () => {
        preventedAutoFocus = true
      },
    })
  }

  if (!isMounted) return null

  const resolvedSide = resolvedPlacement.split("-")[0]

  return (
    <FloatingPortal root={container as HTMLElement | null}>
      <FloatingFocusManager
        context={context}
        modal={false}
        initialFocus={preventedAutoFocus ? -1 : 0}
      >
        <div
          ref={refs.setFloating}
          data-slot="popover-content"
          data-side={resolvedSide}
          // "initial" (the one-rAF-frame gap between mount and "open") counts
          // as open too, otherwise the panel renders at full opacity/scale
          // then snaps back to its animate-in starting keyframe a frame
          // later — a visible pop-then-re-animate.
          data-open={status === "initial" || status === "open" || undefined}
          data-closed={status === "close" || undefined}
          // Position via top/left, not floating-ui's transform-based
          // floatingStyles — the animate-in/out classes below also animate
          // `transform`, which would override the inline transform and
          // flash the popover at (0, 0) before it snaps into place.
          // `isPositioned` stays hidden-until-true because x/y start at
          // (0, 0) until computePosition() resolves, so a Popover's first
          // ever open would otherwise paint one frame at (0, 0); later opens
          // don't flash since x/y keep their last-known value across closes.
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            visibility: isPositioned ? "visible" : "hidden",
          }}
          className={cn(
            "z-50 flex w-72 flex-col gap-4 rounded-none bg-base-100 p-4 text-sm text-base-content ring-1 ring-foreground/10 outline-hidden transition-none duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...getFloatingProps(props)}
        >
          {children}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("text-xs font-semibold uppercase", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
