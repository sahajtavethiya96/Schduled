'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarBlank, X } from '@phosphor-icons/react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function parseDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

interface BookingsDateFilterProps {
  tab: string
  dateFrom: string
  dateTo: string
}

export function BookingsDateFilter({ tab, dateFrom, dateTo }: BookingsDateFilterProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const range: DateRange = {
    from: parseDate(dateFrom),
    to:   parseDate(dateTo),
  }

  function push(from: Date | undefined, to: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    params.delete('page')
    if (from) params.set('dateFrom', formatISO(from))
    else params.delete('dateFrom')
    if (to) params.set('dateTo', formatISO(to))
    else params.delete('dateTo')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  function handleSelect(next: DateRange | undefined) {
    push(next?.from, next?.to)
    if (next?.from && next?.to) setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    push(undefined, undefined)
  }

  const hasFilter = range.from || range.to
  const label = range.from
    ? range.to
      ? `${fmt.format(range.from)} – ${fmt.format(range.to)}`
      : `From ${fmt.format(range.from)}`
    : 'Date range'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-2 px-3 font-normal',
            hasFilter
              ? 'border-primary/50 text-base-content'
              : 'text-muted-foreground hover:text-base-content'
          )}
        >
          <CalendarBlank
            size={14}
            className={cn(hasFilter ? 'text-primary' : 'text-muted-foreground')}
          />
          <span className="text-sm">{label}</span>
          {hasFilter && (
            <span
              role="button"
              aria-label="Clear date filter"
              onClick={clear}
              className="ml-0.5 flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-base-content"
            >
              <X size={11} weight="bold" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={1}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
