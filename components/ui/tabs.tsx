"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@headlessui/react"

import { cn } from "@/lib/utils"

// Headless UI's TabGroup is *index*-based (`selectedIndex`/`onChange(index)`,
// matched purely by DOM position), while this file's consumer-facing API is
// *value*-based (`value`/`onValueChange(value)`, matched by a string each
// TabsTrigger/TabsContent carries independently). To bridge that without
// touching jobs-tabs.tsx (the one consumer, using
// `defaultValue`/`onValueChange`/`value="queues"` etc.), <Tabs> walks its
// own `children` on every render — same technique as <Select>'s
// value→content lookup in select.tsx and <Tooltip>'s config lookup in
// tooltip.tsx — to build a value→index map from the TabsTrigger values
// inside TabsList, and translates in both directions at the boundary.
//
// A TabPanel only gets a stable index if it's a *direct descendant of one
// <TabPanels>*, matched by registration order — but this file's consumer
// API renders TabsList and each TabsContent as flat siblings of <Tabs>,
// with no such wrapper. <Tabs> now partitions its children and wraps every
// TabsContent in an implicit <TabPanels className="contents">; `contents`
// (display: contents) makes that wrapper invisible to layout, so
// TabsContent's own `flex-1` still lands on a real flex child of <Tabs>'s
// flex row/column exactly as before, instead of on a non-growing wrapper.
// Rather than requiring consumers to list TabsContent in the same order as
// their matching TabsTrigger, the partitioned content list is re-sorted by
// each content's own `value` against the trigger-derived value→index map —
// so this is order-independent.
//
// One more Headless-UI-specific trap: Tab's own render-prop slot already
// has an `active` boolean (`useActivePress` — "is this being pressed right
// now", a transient :active-like state), which Headless UI auto-stamps as
// a real `data-active=""` DOM attribute — and that auto-stamp always wins
// over any `data-active` this file tries to pass in manually (confirmed
// against Headless UI's own render merge order). This file's *existing*
// className strings use `data-active:` to mean "this is the selected tab"
// (via the `data-active` custom variant defined in app/globals.css) — a
// completely different,
// unrelated meaning that would silently collide with Headless UI's own
// attribute. Rather than rename the DOM contract app-wide or fight
// Headless UI for the attribute, TabsTrigger computes its selected-state
// classes directly in JS (Headless UI's `className` prop accepts a
// `(bag) => string` function, the one prop this library explicitly
// special-cases for render-prop access) instead of relying on a `data-*`
// attribute selector — same visual output, no attribute-name collision.
// `variant` (default/line) is threaded from TabsList to TabsTrigger via
// its own small context, replacing what used to be a
// `group-data-[variant=line]/tabs-list:` ancestor CSS selector.
type TabsListContextValue = { variant: "default" | "line" }

const TabsListContext = React.createContext<TabsListContextValue>({
  variant: "default",
})

function collectTriggerValues(children: React.ReactNode, values: string[]) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === TabsTrigger) {
      const { value } = child.props as { value: string }
      values.push(value)
      return
    }
    const nested = (child.props as { children?: React.ReactNode } | null)
      ?.children
    if (nested) collectTriggerValues(nested, values)
  })
}

function partitionChildren(children: React.ReactNode) {
  const rest: React.ReactNode[] = []
  const contents: React.ReactElement[] = []
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === TabsContent) {
      contents.push(child)
    } else {
      rest.push(child)
    }
  })
  return { rest, contents }
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TabGroup>,
  "vertical" | "selectedIndex" | "defaultIndex" | "onChange" | "children"
> & {
  orientation?: "horizontal" | "vertical"
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}) {
  const values = React.useMemo(() => {
    const list: string[] = []
    collectTriggerValues(children, list)
    return list
  }, [children])

  const valueToIndex = React.useMemo(() => {
    const map = new Map<string, number>()
    values.forEach((v, i) => map.set(v, i))
    return map
  }, [values])

  const { rest, contents } = React.useMemo(
    () => partitionChildren(children),
    [children]
  )

  const orderedContents = React.useMemo(
    () =>
      [...contents].sort((a, b) => {
        const av = (a.props as { value: string }).value
        const bv = (b.props as { value: string }).value
        return (valueToIndex.get(av) ?? 0) - (valueToIndex.get(bv) ?? 0)
      }),
    [contents, valueToIndex]
  )

  const isControlled = value !== undefined
  const selectedIndex = isControlled
    ? (valueToIndex.get(value) ?? 0)
    : undefined
  const defaultIndex =
    defaultValue !== undefined ? (valueToIndex.get(defaultValue) ?? 0) : 0

  return (
    <TabGroup
      data-slot="tabs"
      data-orientation={orientation}
      vertical={orientation === "vertical"}
      selectedIndex={selectedIndex}
      defaultIndex={defaultIndex}
      onChange={(index) => {
        const next = values[index]
        if (next !== undefined) onValueChange?.(next)
      }}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    >
      {rest}
      <TabPanels className="contents">{orderedContents}</TabPanels>
    </TabGroup>
  )
}

const tabsListVariants = cva(
  "tabs group/tabs-list inline-flex w-fit items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabList> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsListContext.Provider value={{ variant: variant ?? "default" }}>
      <TabList
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsListContext.Provider>
  )
}

function TabsTrigger({
  className,
  value: _value,
  ...props
}: Omit<React.ComponentProps<typeof Tab>, "children"> & {
  value: string
  children?: React.ReactNode
}) {
  const { variant } = React.useContext(TabsListContext)
  const isLine = variant === "line"

  return (
    <Tab
      data-slot="tabs-trigger"
      className={(bag: { selected: boolean }) =>
        cn(
          "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-transparent px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap text-foreground/60 uppercase transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-4 group-data-vertical/tabs:py-2 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
          "after:absolute after:bg-primary after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5",
          isLine
            ? "bg-transparent"
            : bag.selected &&
                "bg-background text-foreground dark:border-input dark:bg-input/30 dark:text-foreground",
          isLine && bag.selected && "after:opacity-100",
          typeof className === "function" ? className(bag) : className
        )
      }
      {...props}
    />
  )
}

function TabsContent({
  className,
  value: _value,
  ...props
}: React.ComponentProps<typeof TabPanel> & { value: string }) {
  return (
    <TabPanel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
