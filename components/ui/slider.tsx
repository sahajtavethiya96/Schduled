"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  orientation = "horizontal",
  disabled,
  name,
  onValueChange,
  onValueCommit,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "value" | "onChange"> & {
  defaultValue?: number[]
  value?: number[]
  min?: number
  max?: number
  step?: number
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  name?: string
  onValueChange?: (value: number[]) => void
  onValueCommit?: (value: number[]) => void
}) {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = React.useState<number[]>(
    () => defaultValue ?? [min, max]
  )
  const values = isControlled ? value : uncontrolled

  const setValues = React.useCallback(
    (next: number[]) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const handleThumbChange = (index: number, raw: number) => {
    const next = [...values]
    const lower = index > 0 ? next[index - 1] : min
    const upper = index < next.length - 1 ? next[index + 1] : max
    next[index] = Math.min(Math.max(raw, lower), upper)
    setValues(next)
  }

  const percent = (v: number) => ((v - min) / (max - min)) * 100
  const rangeStart = values.length > 1 ? percent(Math.min(...values)) : 0
  const rangeEnd = percent(Math.max(...values))
  const isVertical = orientation === "vertical"

  return (
    <div
      data-slot="slider"
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <div
        data-slot="slider-track"
        data-orientation={orientation}
        className="relative grow overflow-hidden bg-input/50 data-horizontal:h-0.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-0.5"
      >
        <div
          data-slot="slider-range"
          data-orientation={orientation}
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          style={
            isVertical
              ? { bottom: `${rangeStart}%`, top: `${100 - rangeEnd}%` }
              : { left: `${rangeStart}%`, right: `${100 - rangeEnd}%` }
          }
        />
      </div>
      {values.map((v, index) => (
        <React.Fragment key={index}>
          <input
            type="range"
            aria-label={`Value ${index + 1}`}
            aria-orientation={orientation}
            min={min}
            max={max}
            step={step}
            value={v}
            disabled={disabled}
            name={values.length > 1 && name ? `${name}[${index}]` : name}
            onChange={(event) =>
              handleThumbChange(index, Number(event.target.value))
            }
            onPointerUp={() => onValueCommit?.(values)}
            className={cn(
              "peer absolute inset-0 m-0 w-full cursor-pointer appearance-none bg-transparent opacity-0 focus-visible:outline-none disabled:cursor-not-allowed",
              "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none",
              isVertical && "h-full"
            )}
            style={{ zIndex: values.length - index }}
          />
          <div
            data-slot="slider-thumb"
            aria-hidden="true"
            className="pointer-events-none absolute block size-3 shrink-0 border-none bg-primary transition-colors select-none peer-hover:ring-2 peer-hover:ring-ring/30 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30 peer-disabled:opacity-50"
            style={
              isVertical
                ? { bottom: `${percent(v)}%`, left: "50%", transform: "translate(-50%, 50%)" }
                : { left: `${percent(v)}%`, top: "50%", transform: "translate(-50%, -50%)" }
            }
          />
        </React.Fragment>
      ))}
    </div>
  )
}

export { Slider }
