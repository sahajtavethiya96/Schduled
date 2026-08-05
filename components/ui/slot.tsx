import * as React from "react"

// Provides `asChild` support (rendering a component's own props/behavior
// onto a single child element instead of wrapping it in an extra DOM node)
// for button.tsx, badge.tsx, breadcrumb.tsx, form.tsx, popover.tsx,
// tooltip.tsx, dialog.tsx, sheet.tsx, alert-dialog.tsx, and
// dropdown-menu.tsx. Behavior contract for every asChild call site:
//  - event handlers compose (child's handler fires first, then the slot's
//    own — e.g. DialogTrigger's onClick still fires after a consumer's own
//    onClick on the slotted child, and still respects that handler calling
//    preventDefault())
//  - `className` concatenates (slot's classes first, then the child's)
//  - `style` shallow-merges (child's keys win on conflict)
//  - every other prop: the child's own explicit value wins over the slot's
//  - `ref` composes the slot's forwarded ref with the child's own ref, so
//    both still get the DOM node (needed by e.g. Popover's
//    `useMergeRefs`/`setReferenceElement` wiring on asChild triggers)
//
// Not supported: lazy-child resolution for injecting extra markup around a
// render-prop child. Grepped for zero usage anywhere in this codebase
// (`grep -rn Slottable`), so it's intentionally left out rather than
// carried as unexercised dead weight — flagged here rather than silently
// absorbed. If a future asChild call site ever needs that capability, it
// would need to be added.
function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    return ref(value)
  } else if (ref != null) {
    ;(ref as React.RefObject<T | null>).current = value
  }
}

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) setRef(ref, node)
  }
}

// Memoized via `useCallback` (deps: the individual refs), not a
// freshly-allocated closure every render. This is load-bearing, not just an
// optimization: an unmemoized composed ref changes identity every render,
// so React detaches (calls it with `null`) and reattaches (calls it with
// the node) on every single render. Anything downstream that calls setState
// from that ref — e.g. Popover's `setReferenceElement` — sees a genuine
// null→node→null→node value flip every render and re-renders forever
// (confirmed by hitting exactly this "Maximum update depth exceeded" loop
// against Popover's asChild trigger before switching to useCallback here).
function useComposedRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs)
}

// React 19 moved `ref` into `props.ref` and installs a dev-mode warning
// getter on the legacy top-level `element.ref` access path to catch code
// still reading it the old way — this checks which location is safe to
// read without tripping that warning, rather than assuming one React
// version's ref convention.
function getElementRef(
  element: React.ReactElement
): React.Ref<unknown> | undefined {
  const elementWithRef = element as unknown as { ref?: React.Ref<unknown> }
  const props = element.props as { ref?: React.Ref<unknown> }

  let getter = Object.getOwnPropertyDescriptor(props, "ref")?.get
  let mayWarn =
    getter &&
    "isReactWarning" in getter &&
    (getter as unknown as { isReactWarning?: boolean }).isReactWarning
  if (mayWarn) {
    return elementWithRef.ref
  }

  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get
  mayWarn =
    getter &&
    "isReactWarning" in getter &&
    (getter as unknown as { isReactWarning?: boolean }).isReactWarning
  if (mayWarn) {
    return props.ref
  }

  return props.ref || elementWithRef.ref
}

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>
) {
  const overrideProps: Record<string, unknown> = { ...childProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]
    const isHandler = /^on[A-Z]/.test(propName)

    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          const result = (childPropValue as (...a: unknown[]) => unknown)(
            ...args
          )
          ;(slotPropValue as (...a: unknown[]) => unknown)(...args)
          return result
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === "style") {
      overrideProps[propName] = {
        ...(slotPropValue as object | undefined),
        ...(childPropValue as object | undefined),
      }
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue]
        .filter(Boolean)
        .join(" ")
    }
  }

  return { ...slotProps, ...overrideProps }
}

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...slotProps }, forwardedRef) => {
    const isValidSingleChild =
      React.Children.count(children) === 1 && React.isValidElement(children)
    // `childRef`/`composedRef` are computed unconditionally, before the
    // early-return below — useComposedRefs (a hook) can't be called
    // conditionally.
    const childRef = isValidSingleChild ? getElementRef(children) : undefined
    const composedRef = useComposedRefs(forwardedRef, childRef)

    if (!isValidSingleChild) {
      if (children || children === 0) {
        throw new Error(
          "Slot failed to slot onto its children. Expected a single React element child."
        )
      }
      return children as React.ReactElement | null
    }

    const mergedProps = mergeProps(
      slotProps as Record<string, unknown>,
      (children.props ?? {}) as Record<string, unknown>
    )

    if (children.type !== React.Fragment) {
      ;(mergedProps as { ref?: unknown }).ref = forwardedRef
        ? composedRef
        : childRef
    }

    return React.cloneElement(children, mergedProps)
  }
)
Slot.displayName = "Slot"

export { Slot }
