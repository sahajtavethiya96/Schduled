'use client'

import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface CountryOption {
  code: string
  name: string
}

/**
 * Searchable, scrollable country picker. Mirrors TimeCombobox (a Popover with a
 * type-to-filter input) so a long list — ~200 countries — is usable.
 */
export function CountryCombobox({
  value,
  options,
  onChange,
  triggerClassName,
}: {
  value: string
  options: CountryOption[]
  onChange: (code: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const selected = options.find((o) => o.code === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase() === q
    )
  }, [query, options])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const id = setTimeout(() => {
      inputRef.current?.focus()
      selectedRef.current?.scrollIntoView({ block: 'center' })
    }, 0)
    return () => clearTimeout(id)
  }, [open])

  function select(code: string) {
    onChange(code)
    setOpen(false)
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex h-9 items-center justify-between gap-1.5 border border-input bg-base-100 px-3 text-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary data-[state=open]:border-primary',
            triggerClassName
          )}
          type="button"
        >
          <span className="truncate">{selected?.name ?? 'Select country'}</span>
          <CaretDown className="shrink-0 text-muted-foreground" size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-64 gap-0 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-base-300 px-2.5 py-1.5">
          <MagnifyingGlass className="shrink-0 text-muted-foreground" size={14} />
          <input
            className="h-7 w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[0]) select(filtered[0].code)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Search country…"
            ref={inputRef}
            value={query}
          />
        </div>

        {/* Scrollable, filtered list */}
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No country found
            </p>
          ) : (
            filtered.map((o) => {
              const isSelected = o.code === value
              return (
                <button
                  className={cn(
                    'flex w-full items-center justify-between px-2 py-1.5 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'hover:bg-base-200'
                  )}
                  key={o.code}
                  onClick={() => select(o.code)}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                >
                  <span className="truncate">{o.name}</span>
                  {isSelected && <Check className="shrink-0" size={13} weight="bold" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
