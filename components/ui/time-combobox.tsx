'use client'

import { CaretDown, Check } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// 30-min increments stored as HH:mm (24h)
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

// Default display: "5:00 PM"
function defaultFormat(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Strip everything but letters/digits so "230pm", "2:30 pm", "2:30pm" all match
const normalizeTime = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * A compact, type-to-filter time picker that avoids fast auto-scroll
 * arrows and lets users type a time (e.g. "230pm").
 */
export function TimeCombobox({
  value,
  onChange,
  format = defaultFormat,
  triggerClassName,
  label,
}: {
  value: string
  onChange: (v: string) => void
  format?: (t: string) => string
  triggerClassName?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // When this combobox lives inside a modal Dialog, the dialog's scroll-lock
  // blocks wheel scrolling on a body-portaled popover. Portaling the dropdown
  // INTO the dialog keeps it within the allowed scroll region so it scrolls.
  // Must default/fall back to `undefined`, not `null` — FloatingPortal's
  // `root` prop treats a literal `null` as "wait for it to resolve" and
  // never creates the portal node, which permanently stalls the popover for
  // every trigger outside a Dialog (i.e. almost everywhere this is used).
  const [container, setContainer] = useState<Element | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = normalizeTime(query)
    if (!q) return TIMES
    return TIMES.filter((t) => normalizeTime(format(t)).includes(q))
  }, [query, format])

  // On open: target the nearest dialog, clear query, focus input, scroll to value
  useEffect(() => {
    if (!open) return
    setContainer(triggerRef.current?.closest('[role="dialog"]') ?? undefined)
    setQuery('')
    const id = setTimeout(() => {
      inputRef.current?.focus()
      selectedRef.current?.scrollIntoView({ block: 'center' })
    }, 0)
    return () => clearTimeout(id)
  }, [open])

  function select(t: string) {
    onChange(t)
    setOpen(false)
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          aria-label={label}
          className={cn(
            'flex h-9 w-[120px] items-center justify-between gap-1 border border-input bg-background px-3 text-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary data-[state=open]:border-primary data-[state=open]:ring-1 data-[state=open]:ring-primary',
            triggerClassName
          )}
          type="button"
        >
          <span className="truncate">{format(value)}</span>
          <CaretDown className="shrink-0 text-muted-foreground" size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        container={container}
        collisionPadding={12}
        className="w-[150px] gap-0 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        sideOffset={4}
      >
        {/* Type-to-filter input */}
        <div className="border-b border-border p-1.5">
          <input
            className="h-8 w-full border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[0]) select(filtered[0])
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Type a time…"
            ref={inputRef}
            value={query}
          />
        </div>

        {/* Filtered list — plain scroll, no auto-scroll arrows */}
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No match
            </p>
          ) : (
            filtered.map((t) => {
              const isSelected = t === value
              return (
                <button
                  className={cn(
                    'flex w-full items-center justify-between px-2 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'hover:bg-muted'
                  )}
                  key={t}
                  onClick={() => select(t)}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                >
                  {format(t)}
                  {isSelected && <Check size={13} weight="bold" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
