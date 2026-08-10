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

// Headless UI's Listbox has no `required` prop, and its own hidden sync
// input is type="hidden" — barred from constraint validation regardless. To
// restore native "can't submit while empty" behavior, <Select> renders a
// second, real `<select required>` mirroring the option values, hidden via
// the `sr-only` clip technique (not `display:none`, which Chrome treats as
// unfocusable and blocks validation). It carries no `name`, so it never
// joins the actual form payload — only the genuine hidden input does that.
// It isn't pixel-aligned over the trigger (would require wrapping
// SelectTrigger's button, breaking flex-item classes some consumers apply
// directly to it), but the native validation bubble still anchors to it and
// submission is still blocked either way.
//
// <SelectValue> needs to show the selected item's own rendered content
// without the consumer repeating it. Headless UI's `ListboxSelectedOption`
// needs the full options list passed as a prop, which only works if
// trigger and options are defined together — this file's API instead
// splits them into separate sibling subtrees, so <Select> walks its own
// `children` on every render to build a value→content lookup shared via
// context (recomputed fresh so it stays correct even if `value` changes
// without the dropdown ever opening).
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
        "select bg-none flex w-full items-center justify-between gap-2 rounded-none border border-input bg-base-100 px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error data-placeholder:text-muted-foreground data-[size=default]:h-10 data-[size=sm]:h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
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
  // Only "popper" positioning (Headless UI's `anchor` system) is
  // implemented; "item-aligned" (native-<select>-style) has no consumers.
  // `position` is still accepted for API shape compatibility.
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
        // Exit animation is keyed off data-leave, not data-closed — Headless
        // UI briefly sets data-closed together with data-open during the
        // open transition's "prepare" step, which made data-closed:
        // animate-out fight data-open:animate-in (pop-then-re-animate
        // glitch). data-leave is only ever set while actually closing.
        "z-50 max-h-(--anchor-max-height) min-w-36 w-(--button-width) overflow-x-hidden overflow-y-auto rounded-none bg-base-100 text-base-content ring-1 ring-foreground/10 transition-none duration-100 data-[anchor~=bottom]:slide-in-from-top-2 data-[anchor~=left]:slide-in-from-right-2 data-[anchor~=right]:slide-in-from-left-2 data-[anchor~=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-leave:animate-out data-leave:fade-out-0 data-leave:zoom-out-95",
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
        "relative flex w-full cursor-pointer items-center gap-2 rounded-none py-1.5 pr-8 pl-2.5 text-sm transition-colors outline-hidden select-none data-focus:bg-accent data-focus:text-accent-content data-focus:**:text-accent-content data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
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
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-base-300/60", className)}
      {...props}
    />
  )
}

// Headless UI's Listbox has no built-in scroll-up/down affordance — options
// overflow via plain CSS scrolling instead. Kept as no-op passthroughs for
// API-surface completeness.
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
