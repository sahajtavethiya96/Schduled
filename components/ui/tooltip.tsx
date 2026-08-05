"use client"

import * as React from "react"
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useTransitionStatus,
  useMergeRefs,
  useDelayGroup,
  FloatingDelayGroup,
  FloatingPortal,
  FloatingArrow,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
  type Placement,
} from "@floating-ui/react"
import { Slot } from "@/components/ui/slot"

import { cn } from "@/lib/utils"

type TooltipContentConfig = {
  side: "top" | "right" | "bottom" | "left"
  align: "start" | "center" | "end"
  sideOffset: number
  collisionPadding: number
}

const DEFAULT_CONTENT_CONFIG: TooltipContentConfig = {
  side: "top",
  align: "center",
  sideOffset: 0,
  collisionPadding: 8,
}

function readContentConfig(children: React.ReactNode): TooltipContentConfig {
  let config = DEFAULT_CONTENT_CONFIG
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === TooltipContent) {
      const p = child.props as Partial<TooltipContentConfig>
      config = {
        side: p.side ?? DEFAULT_CONTENT_CONFIG.side,
        align: p.align ?? DEFAULT_CONTENT_CONFIG.align,
        sideOffset: p.sideOffset ?? DEFAULT_CONTENT_CONFIG.sideOffset,
        collisionPadding:
          p.collisionPadding ?? DEFAULT_CONTENT_CONFIG.collisionPadding,
      }
    }
  })
  return config
}

function toPlacement(
  side: "top" | "right" | "bottom" | "left",
  align: "start" | "center" | "end"
): Placement {
  if (align === "center") return side
  return `${side}-${align}`
}

function TooltipProvider({
  delayDuration = 0,
  children,
}: {
  delayDuration?: number
  children?: React.ReactNode
}) {
  return (
    <FloatingDelayGroup delay={delayDuration} timeoutMs={300}>
      {children}
    </FloatingDelayGroup>
  )
}

type TooltipContextValue = {
  isMounted: boolean
  status: "unmounted" | "initial" | "open" | "close"
  refs: ReturnType<typeof useFloating>["refs"]
  x: number | null
  y: number | null
  strategy: "absolute" | "fixed"
  isPositioned: boolean
  context: ReturnType<typeof useFloating>["context"]
  placement: Placement
  arrowRef: React.RefObject<SVGSVGElement | null>
  getReferenceProps: (
    userProps?: React.HTMLProps<Element>
  ) => Record<string, unknown>
  getFloatingProps: (
    userProps?: React.HTMLProps<HTMLElement>
  ) => Record<string, unknown>
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext(component: string) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Tooltip>`)
  }
  return ctx
}

function Tooltip({
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

  const { side, align, sideOffset, collisionPadding } =
    readContentConfig(children)
  const placement = toPlacement(side, align)
  const arrowRef = React.useRef<SVGSVGElement>(null)

  const { refs, x, y, strategy, isPositioned, context, placement: resolvedPlacement } =
    useFloating({
      open,
      onOpenChange: setOpen,
      placement,
      middleware: [
        offset(sideOffset),
        flip({ padding: collisionPadding }),
        shift({ padding: collisionPadding }),
        arrow({ element: arrowRef }),
      ],
      whileElementsMounted: autoUpdate,
    })

  const { delay } = useDelayGroup(context)
  const hover = useHover(context, { delay, move: false })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: "tooltip" })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])

  const { isMounted, status } = useTransitionStatus(context, {
    duration: 100,
  })

  return (
    <TooltipContext.Provider
      value={{
        isMounted,
        status,
        refs,
        x,
        y,
        strategy,
        isPositioned,
        context,
        placement: resolvedPlacement,
        arrowRef,
        getReferenceProps,
        getFloatingProps,
      }}
    >
      {children}
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { refs, getReferenceProps } = useTooltipContext("TooltipTrigger")
  const Comp = asChild ? Slot : "button"
  const ref = useMergeRefs([refs.setReference])

  return (
    <Comp
      ref={ref}
      data-slot="tooltip-trigger"
      {...getReferenceProps(props)}
    />
  )
}

function TooltipContent({
  className,
  side: _side,
  align: _align,
  sideOffset: _sideOffset,
  collisionPadding: _collisionPadding,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  collisionPadding?: number
}) {
  const {
    isMounted,
    status,
    refs,
    x,
    y,
    strategy,
    isPositioned,
    context,
    placement,
    arrowRef,
    getFloatingProps,
  } = useTooltipContext("TooltipContent")

  if (!isMounted) return null

  const resolvedSide = placement.split("-")[0]

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        // See components/ui/popover.tsx's PopoverContent for why this is
        // top/left (not floating-ui's transform-based floatingStyles) plus
        // an isPositioned visibility gate — same conflict with the
        // data-open/data-closed animate-in/out classes below, same async
        // first-open flash otherwise.
        style={{
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          visibility: isPositioned ? "visible" : "hidden",
        }}
        data-slot="tooltip-content"
        data-side={resolvedSide}
        // See components/ui/popover.tsx's PopoverContent for why "initial"
        // counts as open too (avoids a pop-then-re-animate double-open).
        data-open={status === "initial" || status === "open" || undefined}
        data-closed={status === "close" || undefined}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-none bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 transition-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...getFloatingProps(props)}
      >
        {children}
        <FloatingArrow
          ref={arrowRef}
          context={context}
          width={10}
          height={5}
          tipRadius={0}
          className="z-50 fill-foreground"
        />
      </div>
    </FloatingPortal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
