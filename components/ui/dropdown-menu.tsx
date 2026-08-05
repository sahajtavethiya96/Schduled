"use client"

import * as React from "react"
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  MenuSection,
  MenuHeading,
  MenuSeparator,
} from "@headlessui/react"
import { Slot } from "@/components/ui/slot"

import { cn, hideUntilPositioned } from "@/lib/utils"
import { CheckIcon, CaretRightIcon } from "@phosphor-icons/react"

// MenuItem hardcodes `role="menuitem"` itself — `role` is
// listed in Headless UI's own ItemPropsWeControl and always wins the
// internal prop merge, so passing role="menuitemcheckbox"/"menuitemradio"
// directly to <MenuItem> is silently overwritten (and rejected by its
// types). Rendering through a tiny custom tag component via `as` — which
// receives Headless UI's fully-merged props (including its own
// role="menuitem") and substitutes the real role before rendering the DOM
// node — is the only way to get accurate ARIA roles on the checkbox/radio
// item variants. Used only by DropdownMenuCheckboxItem/RadioItem below.
function createMenuItemRoleTag(role: string) {
  return React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
    function MenuItemRoleTag({ role: _incomingRole, ...props }, ref) {
      return <div ref={ref} role={role} {...props} />
    }
  )
}
const MenuItemCheckboxTag = createMenuItemRoleTag("menuitemcheckbox")
const MenuItemRadioTag = createMenuItemRoleTag("menuitemradio")

// Shares whether the root <Menu> is open with descendants that need to know
// (currently just DropdownMenuSub, so it can reset its own local open state
// when the whole dropdown closes — see DropdownMenuSub below).
const DropdownMenuRootOpenContext = React.createContext(false)

type DropdownMenuContextValue = { modal: boolean }
const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  modal: true,
})

function DropdownMenu({
  modal = true,
  children,
}: {
  modal?: boolean
  children?: React.ReactNode
}) {
  return (
    <DropdownMenuContext.Provider value={{ modal }}>
      <Menu>
        {({ open }) => (
          <DropdownMenuRootOpenContext.Provider value={open}>
            {children}
          </DropdownMenuRootOpenContext.Provider>
        )}
      </Menu>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuTrigger({
  asChild = false,
  ...props
}: React.ComponentProps<typeof MenuButton> & { asChild?: boolean }) {
  return (
    <MenuButton
      as={asChild ? Slot : undefined}
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof MenuItems> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  const { modal } = React.useContext(DropdownMenuContext)
  const anchorTo =
    align === "end" ? "bottom end" : align === "center" ? "bottom" : "bottom start"

  return (
    <MenuItems
      data-slot="dropdown-menu-content"
      anchor={{ to: anchorTo, gap: sideOffset }}
      modal={modal}
      transition
      className={cn(
        "z-50 max-h-(--anchor-max-height) w-(--button-width) min-w-48 overflow-x-hidden overflow-y-auto rounded-none bg-popover p-1.5 text-popover-foreground ring-1 ring-foreground/10 transition-none duration-100 data-[anchor~=bottom]:slide-in-from-top-2 data-[anchor~=left]:slide-in-from-right-2 data-[anchor~=right]:slide-in-from-left-2 data-[anchor~=top]:slide-in-from-bottom-2 data-leave:overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-leave:animate-out data-leave:fade-out-0 data-leave:zoom-out-95",
        className
      )}
      {...props}
      ref={hideUntilPositioned}
    />
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof MenuSection>) {
  return <MenuSection data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<typeof MenuItem> & {
  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
}) {
  return (
    <MenuItem
      as={asChild ? Slot : "div"}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-pointer items-center gap-2 rounded-none px-2.5 py-1.5 text-sm font-medium transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-foreground not-data-[variant=destructive]:data-focus:**:text-accent-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-focus:bg-destructive/10 data-[variant=destructive]:data-focus:text-destructive dark:data-[variant=destructive]:data-focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "children"> & {
  children?: React.ReactNode
  checked?: boolean
  inset?: boolean
}) {
  return (
    <MenuItem
      as={MenuItemCheckboxTag} // see role-tag note above imports
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      aria-checked={checked}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-none py-1.5 pr-8 pl-2.5 text-sm font-medium transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-foreground data-focus:**:text-accent-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        {checked && <CheckIcon />}
      </span>
      {children}
    </MenuItem>
  )
}

type DropdownMenuRadioGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}
const DropdownMenuRadioGroupContext =
  React.createContext<DropdownMenuRadioGroupContextValue>({})

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <DropdownMenuRadioGroupContext.Provider value={{ value, onValueChange }}>
      <div data-slot="dropdown-menu-radio-group" role="group" {...props}>
        {children}
      </div>
    </DropdownMenuRadioGroupContext.Provider>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  value,
  inset,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "children"> & {
  children?: React.ReactNode
  value: string
  inset?: boolean
}) {
  const group = React.useContext(DropdownMenuRadioGroupContext)
  const checked = group.value === value

  return (
    <MenuItem
      as={MenuItemRadioTag} // see role-tag note above imports
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      aria-checked={checked}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) group.onValueChange?.(value)
      }}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-none py-1.5 pr-8 pl-2.5 text-sm font-medium transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-foreground data-focus:**:text-accent-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        {checked && <CheckIcon />}
      </span>
      {children}
    </MenuItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuHeading> & {
  inset?: boolean
}) {
  return (
    <MenuHeading
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase data-inset:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuSeparator>) {
  return (
    <MenuSeparator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

// Headless UI's Menu has no submenu primitive at all — confirmed against
// the official docs (only Menu/MenuButton/MenuItems/MenuItem are documented)
// and against the maintainers directly: a real nested <Menu> inside a
// MenuItem was tried and rejected as a foundation here, because Headless
// UI's own maintainer has stated nested Menus are "not currently
// supported" due to a shared internal stack-machine that isn't designed
// for menu-in-menu coordination (github.com/tailwindlabs/headlessui,
// discussion #2418) — it can cause a submenu's own interactions to
// spuriously close the parent menu.
//
// DropdownMenuSub/SubTrigger/SubContent below are therefore hand-built
// without a second <Menu> instance: local open state (plain React
// useState, not Headless UI's menu machine), hover-intent open/close
// timers, and manual ArrowRight/ArrowLeft handling (Headless UI's own
// MenuItems keydown handler has no case for either key, so this doesn't
// conflict with it). DropdownMenuSubContent's own children are still
// ordinary DropdownMenuItem/MenuItem instances registered with the single
// parent <Menu> — that part *is* natively supported, since it's just more
// items in one menu, not a second menu root — so they keep full Headless
// UI keyboard nav, typeahead, and close-on-select behavior. One
// simplification: Home/End and top-level Arrow-Up/Down cycling treat the
// whole tree as one flat list rather than scoping strictly per submenu
// level.
//
// There is no real consumer of this today (grep the repo — nothing uses
// DropdownMenuSub), so this has been verified by typecheck/build and
// careful reading of Headless UI's source only, not by live interaction
// testing. Verify it against real usage before shipping the first
// consumer that relies on it.
type DropdownMenuSubContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLElement | null>
  scheduleOpen: () => void
  scheduleClose: () => void
  cancelSchedule: () => void
}
const DropdownMenuSubContext =
  React.createContext<DropdownMenuSubContextValue | null>(null)

function useDropdownMenuSubContext(component: string) {
  const ctx = React.useContext(DropdownMenuSubContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <DropdownMenuSub>`)
  }
  return ctx
}

function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)
  const contentRef = React.useRef<HTMLElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootOpen = React.useContext(DropdownMenuRootOpenContext)

  const cancelSchedule = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])
  const scheduleOpen = React.useCallback(() => {
    cancelSchedule()
    timerRef.current = setTimeout(() => setOpen(true), 100)
  }, [cancelSchedule])
  const scheduleClose = React.useCallback(() => {
    cancelSchedule()
    timerRef.current = setTimeout(() => setOpen(false), 150)
  }, [cancelSchedule])

  React.useEffect(() => cancelSchedule, [cancelSchedule])
  // Reset when the whole dropdown closes — nothing else would otherwise
  // clear this local state across a close/reopen cycle.
  React.useEffect(() => {
    if (!rootOpen) setOpen(false)
  }, [rootOpen])

  return (
    <DropdownMenuSubContext.Provider
      value={{ open, setOpen, triggerRef, contentRef, scheduleOpen, scheduleClose, cancelSchedule }}
    >
      <div className="relative" data-slot="dropdown-menu-sub">
        {children}
      </div>
    </DropdownMenuSubContext.Provider>
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "children"> & {
  children?: React.ReactNode
  inset?: boolean
}) {
  const { open, setOpen, triggerRef, contentRef, scheduleOpen, scheduleClose } =
    useDropdownMenuSubContext("DropdownMenuSubTrigger")

  return (
    <MenuItem
      as="div"
      ref={triggerRef}
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      data-open={open || undefined}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(event)
        // preventDefault here stops Headless UI's own internal MenuItem
        // onClick handler (which unconditionally closes the menu) from
        // running — its own prop-merge engine checks event.defaultPrevented
        // between the consumer's handler and its own before calling the
        // latter, so this reliably keeps the parent menu open when opening
        // a submenu.
        event.preventDefault()
        setOpen(!open)
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        if (event.key === "ArrowRight") {
          event.preventDefault()
          setOpen(true)
          requestAnimationFrame(() => {
            contentRef.current
              ?.querySelector<HTMLElement>('[role="menuitem"]')
              ?.focus()
          })
        }
      }}
      onMouseEnter={(event: React.MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(event)
        scheduleOpen()
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(event)
        scheduleClose()
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-none px-2.5 py-1.5 text-sm font-medium transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-foreground data-inset:pl-8 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto" />
    </MenuItem>
  )
}

function DropdownMenuSubContent({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<"div">) {
  const { open, setOpen, triggerRef, contentRef, cancelSchedule, scheduleClose } =
    useDropdownMenuSubContext("DropdownMenuSubContent")

  if (!open) return null

  return (
    <div
      ref={contentRef as React.RefObject<HTMLDivElement>}
      data-slot="dropdown-menu-sub-content"
      role="menu"
      onMouseEnter={cancelSchedule}
      onMouseLeave={scheduleClose}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        if (event.key === "ArrowLeft" || event.key === "Escape") {
          event.preventDefault()
          // Stop this from also reaching Headless UI's own MenuItems
          // keydown handler, which does handle Escape (it would close the
          // whole parent menu, not just this submenu).
          event.stopPropagation()
          setOpen(false)
          triggerRef.current?.focus()
        }
      }}
      className={cn(
        "absolute top-0 left-full z-50 ml-1 min-w-36 overflow-hidden rounded-none bg-popover p-1.5 text-popover-foreground ring-1 ring-foreground/10 duration-100",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
