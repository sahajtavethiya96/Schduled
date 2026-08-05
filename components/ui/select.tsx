"use client"

import * as React from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react"

import { cn, hideUntilPositioned } from "@/lib/utils"
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react"

// Headless UI's Listbox natively supports controlled `value`, `disabled`,
// and `name`/`form` (renders a hidden input kept in sync with the
// selection, for native FormData submission — see
// headlessui.com/react/listbox). The one real gap: Headless UI's Listbox
// has no `required` prop, and its own hidden input is type="hidden" —
// barred from constraint validation per the HTML spec regardless. To
// restore native "can't submit while empty" behavior, when `required` is
// set, <Select> renders a second, real `<select required>` mirroring the
// same option values, hidden via the same `sr-only` clip technique used
// elsewhere in this codebase (not `display:none`, which the HTML
// spec/Chrome would treat as unfocusable and log a console error while
// still blocking submission). It carries no `name`, so it never
// participates in the actual form payload — only the genuine hidden input
// above does that. This lives on <Select> itself (not SelectTrigger), so
// it applies uniformly to every consumer that passes `required`, not just
// contact-form.tsx's `<Select name="subject" required>`. It is not
// pixel-aligned over the visible trigger — doing that generically would
// require wrapping SelectTrigger's rendered button in an extra element,
// which would break the `shrink-0`/fixed-width flex-item classes several
// consumers (e.g. communication-form.tsx) apply directly to SelectTrigger,
// since Listbox renders as a Fragment and SelectTrigger's button is today
// a direct flex child in those layouts. The browser's native validation
// bubble still appears (anchored to this element's own position) and
// submission is still blocked either way.
//
// <SelectValue> needs to show the *currently selected item's own rendered
// content* automatically, without the consumer repeating it. Headless
// UI's equivalent (`ListboxSelectedOption`) expects the full options list
// handed to it directly as a prop, which only works if trigger and options
// are defined together in one JSX expression — this file's API shape puts
// SelectValue and the SelectItems in separate sibling subtrees
// (<SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
// <SelectItem/>...</SelectContent>), so that prop can't reach across.
// Instead, <Select> walks its own `children` on every render (cheap: no
// consumer here has more than ~20 items) to build a value→content lookup,
// shared via context — recomputed fresh every render, so it stays correct
// even if the controlled `value` changes from outside without the
// dropdown ever having been opened (unlike a mount-effect-based registry,
// which would go stale until next open).
type SelectContextValue = {
  itemsByValue: Map<string, React.ReactNode>
  currentValue: unknown
}

const SelectContext = React.createContext<SelectContextValue>({
  itemsByValue: new Map(),
  currentValue: undefined,
})

function collectItemContents(
  children: React.ReactNode,
  map: Map<string, React.ReactNode>
) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectItem) {
      const props = child.props as { value: string; children?: React.ReactNode }
      map.set(props.value, props.children)
      return
    }
    const childChildren = (child.props as { children?: React.ReactNode } | null)
      ?.children
    if (childChildren) collectItemContents(childChildren, map)
  })
}

function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  required,
  ...props
}: Omit<
  React.ComponentProps<typeof Listbox>,
  "onChange" | "children" | "value" | "defaultValue"
> & {
  children?: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  required?: boolean
}) {
  const itemsByValue = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>()
    collectItemContents(children, map)
    return map
  }, [children])

  return (
    <Listbox
      data-slot="select"
      value={value}
      defaultValue={defaultValue}
      onChange={onValueChange}
      {...props}
    >
      {({ value: currentValue }) => (
        <SelectContext.Provider value={{ itemsByValue, currentValue }}>
          {children}
          {required && (
            <select
              aria-hidden="true"
              tabIndex={-1}
              required
              className="sr-only"
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={() => {}}
            >
              <option value="" />
              {Array.from(itemsByValue.keys()).map((v) => (
                <option key={v} value={v} />
              ))}
            </select>
          )}
        </SelectContext.Provider>
      )}
    </Listbox>
  )
}

function SelectValue({
  className,
  placeholder,
  ...props
}: React.ComponentProps<"span"> & { placeholder?: React.ReactNode }) {
  const { itemsByValue, currentValue } = React.useContext(SelectContext)
  const hasValue =
    typeof currentValue === "string" && itemsByValue.has(currentValue)
  const content = hasValue
    ? itemsByValue.get(currentValue as string)
    : undefined

  return (
    <span
      data-slot="select-value"
      data-placeholder={hasValue ? undefined : ""}
      className={cn(
        "line-clamp-1 flex items-center gap-1.5",
        className
      )}
      {...props}
    >
      {content ?? placeholder}
    </span>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof ListboxButton>, "children"> & {
  children?: React.ReactNode
  size?: "sm" | "default"
}) {
  const { itemsByValue, currentValue } = React.useContext(SelectContext)
  const hasValue =
    typeof currentValue === "string" && itemsByValue.has(currentValue)

  return (
    <ListboxButton
      data-slot="select-trigger"
      data-size={size}
      data-placeholder={hasValue ? undefined : ""}
      className={cn(
        "select bg-none flex w-full items-center justify-between gap-2 rounded-none border border-input bg-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-placeholder:text-muted-foreground data-[size=default]:h-10 data-[size=sm]:h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
      <CaretDownIcon className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
    </ListboxButton>
  )
}

function SelectContent({
  className,
  children,
  // Two positioning modes were historically supported here: "popper" (a
  // normal floating panel) and "item-aligned" (positions so the selected
  // item lines up over the trigger, like a native OS <select>). This
  // project's own SelectContent always used "popper", and grepping all 11
  // consumers found zero uses of "item-aligned" — so only popper-style
  // positioning (Headless UI's `anchor` system, same mechanism used for
  // DropdownMenu) is implemented here. `position` is still accepted for
  // API shape compatibility but has no effect beyond "popper" behavior.
  position = "popper",
  align = "start",
  ...props
}: React.ComponentProps<typeof ListboxOptions> & {
  position?: "popper" | "item-aligned"
  align?: "start" | "center" | "end"
}) {
  const anchorTo =
    align === "end" ? "bottom end" : align === "center" ? "bottom" : "bottom start"

  return (
    <ListboxOptions
      data-slot="select-content"
      anchor={{ to: anchorTo, gap: 4 }}
      transition
      className={cn(
        // The exit animation is keyed off data-leave, not
        // data-closed — Headless UI briefly sets data-closed together with
        // data-open during the OPEN transition's own internal "prepare"
        // step (a one-frame reset before the enter animation actually
        // starts), which made data-closed:animate-out fight data-open:
        // animate-in and produced a visible pop-then-re-animate glitch on
        // every open. data-leave is only ever set while actually closing.
        "z-50 max-h-(--anchor-max-height) min-w-36 w-(--button-width) overflow-x-hidden overflow-y-auto rounded-none bg-popover text-popover-foreground ring-1 ring-foreground/10 transition-none duration-100 data-[anchor~=bottom]:slide-in-from-top-2 data-[anchor~=left]:slide-in-from-right-2 data-[anchor~=right]:slide-in-from-left-2 data-[anchor~=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-leave:animate-out data-leave:fade-out-0 data-leave:zoom-out-95",
        className
      )}
      {...props}
      ref={hideUntilPositioned}
    >
      {children}
    </ListboxOptions>
  )
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-group"
      role="group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn(
        "px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ListboxOption>) {
  return (
    <ListboxOption
      as="div"
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2 rounded-none py-1.5 pr-8 pl-2.5 text-sm transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-foreground data-focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      {({ selected }) => (
        <>
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
            {selected && <CheckIcon className="pointer-events-none" />}
          </span>
          {children}
        </>
      )}
    </ListboxOption>
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      role="separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

// Headless UI's Listbox has no built-in scroll-up/down affordance (no
// equivalent exports at all) — options overflow via plain CSS scrolling
// instead. Zero current consumers import either of these, and
// time-combobox.tsx exists precisely to avoid fast auto-scroll arrows, so
// relying on native overflow scrolling here is a welcome simplification
// rather than a loss. Kept as no-op passthroughs for API-surface
// completeness.
function SelectScrollUpButton({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectScrollDownButton({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
