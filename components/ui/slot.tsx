import * as React from "react"

// Provides `asChild` support (rendering a component's own props/behavior
// onto a single child element instead of wrapping it in an extra DOM node).
// Behavior contract for every asChild call site:
//  - event handlers compose (child's handler fires first, then the slot's
//    own, and still respects that handler calling preventDefault())
//  - `className` concatenates (slot's classes first, then the child's)
//  - `style` shallow-merges (child's keys win on conflict)
//  - every other prop: the child's own explicit value wins over the slot's
//  - `ref` composes the slot's forwarded ref with the child's own ref, so
//    both still get the DOM node
//
// Not supported: lazy-child resolution (Slottable) for injecting extra
// markup around a render-prop child — add if a future need arises.
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

// Memoized via `useCallback`, not a fresh closure every render — this is
// load-bearing. An unmemoized composed ref changes identity every render,
// so React detaches/reattaches it each time; anything that calls setState
// from that ref (e.g. Popover's `setReferenceElement`) sees a null→node
// flip every render and re-renders forever.
function useComposedRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs)
}

// React 19 moved `ref` into `props.ref` and installs a dev-mode warning
// getter on the legacy `element.ref` path — this checks which location is
// safe to read without tripping that warning.
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
    // Computed unconditionally, before the early-return below — hooks can't
    // be called conditionally.
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
