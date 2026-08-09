'use client'

import { useState } from 'react'
import { ArrowSquareOut, CaretDown, Check, Info, Plus, X } from '@phosphor-icons/react'
import Link from 'next/link'
import type { UseFormReturn } from 'react-hook-form'
import type { BuilderFormValues, ScheduleOption } from './builder'
import { type MeetingLimitRow } from '@/app/actions/availability'
import { FormControl, FormField, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const DURATION_PRESETS = [15, 20, 30, 45, 60, 90, 120]
const INCREMENT_OPTIONS = [15, 30, 45, 60]

function formatDuration(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild type="button">
          <span className="inline-flex cursor-default text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Info size={13} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface TabAvailabilityProps {
  form: UseFormReturn<BuilderFormValues>
  globalLimits: MeetingLimitRow[]
  schedules: ScheduleOption[]
}

export function TabAvailability({ form, schedules, globalLimits: initialLimits }: TabAvailabilityProps) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  // Booking Rules are advanced/optional (sensible defaults already apply), so
  // the whole section is collapsed by default to keep the form uncluttered.
  const [showBookingRules, setShowBookingRules] = useState(false)
  const limits = initialLimits

  const durations = form.watch('durations')
  const defaultDuration = form.watch('defaultDuration')
  const increment = form.watch('startTimeIncrement')
  const scheduleId = form.watch('availabilityScheduleId')
  const bufferBefore = form.watch('bufferBefore') ?? 0
  const bufferAfter = form.watch('bufferAfter') ?? 0
  const windowType = form.watch('bookingWindowType')
  const maxPerDay = form.watch('maxBookingsPerDay')

  const selectedSchedule = schedules.find((s) =>
    scheduleId ? s.id === scheduleId : s.isDefault
  ) ?? schedules[0] ?? null

  function addDuration(min: number) {
    if (durations.includes(min)) return
    const next = [...durations, min].sort((a, b) => a - b)
    form.setValue('durations', next, { shouldDirty: true })
    if (next.length === 1) form.setValue('defaultDuration', min, { shouldDirty: true })
  }

  function removeDuration(min: number) {
    const next = durations.filter((d) => d !== min)
    form.setValue('durations', next, { shouldDirty: true })
    if (defaultDuration === min && next.length > 0) {
      form.setValue('defaultDuration', next[0], { shouldDirty: true })
    }
  }

  function setDefault(min: number) {
    form.setValue('defaultDuration', min, { shouldDirty: true })
  }

  function addCustom() {
    const n = parseInt(customInput, 10)
    if (!n || n < 5 || n > 480) return
    addDuration(n)
    setCustomInput('')
    setShowCustom(false)
  }

  // All chips to render (presets + any custom values not in presets)
  const customDurations = durations.filter((d) => !DURATION_PRESETS.includes(d)).sort((a, b) => a - b)
  const allChips = [...DURATION_PRESETS, ...customDurations]

  return (
    <div className="space-y-6">

      {/* ── Section 1: Duration ───────────────────────────────────────── */}
      <div className="border border-base-300 bg-base-100">
        <div className="px-5 py-4 border-b border-base-300/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</p>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Duration chips */}
          <div>
            <p className="text-sm font-medium text-base-content mb-4">Meeting Durations</p>

            <div className="flex flex-wrap gap-x-2 gap-y-7">
              {allChips.map((d) => {
                const selected = durations.includes(d)
                const isDefault = selected && d === defaultDuration
                return (
                  <div key={d} className="flex flex-col items-center gap-0.5">
                    <div
                      className={cn(
                        'flex items-center border transition-all',
                        selected
                          ? 'bg-primary border-primary text-primary-content'
                          : 'border-base-300 bg-base-100 text-base-content hover:border-primary/60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selected ? setDefault(d) : addDuration(d)}
                        className={cn(
                          'h-8 px-2.5 text-xs font-medium flex items-center gap-1 transition-colors',
                          selected ? 'text-primary-content' : 'hover:text-primary'
                        )}
                      >
                        {selected && <Check size={11} weight="bold" />}
                        {formatDuration(d)}
                      </button>
                      {selected && durations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDuration(d)}
                          className="h-8 w-6 flex items-center justify-center border-l border-primary-content/20 text-primary-content/70 hover:text-primary-content transition-colors"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    {/* Reserve label space so chips align vertically */}
                    <span className={cn('flex items-center gap-0.5 text-2xs font-medium whitespace-nowrap', isDefault ? 'text-primary' : 'invisible')}>
                      <Check size={9} weight="bold" /> Default
                    </span>
                  </div>
                )
              })}

              {/* Add custom */}
              {showCustom ? (
                <div className="flex items-center gap-1 self-start mt-0">
                  <Input
                    autoFocus
                    className="h-8 w-20 text-xs px-2"
                    max={480}
                    min={5}
                    placeholder="min"
                    type="number"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addCustom() }
                      if (e.key === 'Escape') { setShowCustom(false); setCustomInput('') }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    className="h-8 w-8 flex items-center justify-center border border-primary bg-primary text-primary-content hover:bg-primary/90 transition-colors"
                  >
                    <Check size={13} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCustom(false); setCustomInput('') }}
                    className="h-8 w-8 flex items-center justify-center border border-base-300 text-muted-foreground hover:text-base-content transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowCustom(true)}
                    className="h-8 px-2.5 text-xs font-medium border border-dashed border-base-300 text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                  >
                    <Plus size={11} />
                    Custom
                  </button>
                  <span className="text-2xs invisible">x</span>
                </div>
              )}
            </div>

            {form.formState.errors.durations && (
              <p className="mt-2 text-xs text-error">{form.formState.errors.durations.message}</p>
            )}
          </div>

          {/* Start time increment */}
          <div>
            <p className="text-sm font-medium text-base-content mb-1">Start Time Increment</p>
            <p className="text-xs text-muted-foreground mb-3">How often available start times appear on your booking page.</p>
            <div className="flex gap-2">
              {INCREMENT_OPTIONS.map((n) => {
                const active = increment === n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => form.setValue('startTimeIncrement', n, { shouldDirty: true })}
                    className={cn(
                      'h-8 px-3 text-xs font-medium border transition-all flex items-center gap-1',
                      active
                        ? 'bg-primary border-primary text-primary-content'
                        : 'border-base-300 bg-base-100 text-base-content hover:border-primary/60 hover:text-primary'
                    )}
                  >
                    {active && <Check size={11} weight="bold" />}
                    {n}m
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Schedule ───────────────────────────────────────── */}
      {schedules.length === 0 && (
        <div className="border border-base-300 bg-base-100">
          <div className="px-5 py-4 border-b border-base-300/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
          </div>
          <div className="flex flex-col items-start gap-2 px-5 py-6">
            <p className="text-sm font-medium text-base-content">No availability schedule yet</p>
            <p className="text-sm text-muted-foreground">
              Invitees can only book when you have availability hours set. Create a schedule to start taking bookings.
            </p>
            <Link
              href="/availability"
              className="mt-1 inline-flex items-center gap-1.5 border border-primary px-3 h-8 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-content"
            >
              <Plus size={14} /> Set your availability
            </Link>
          </div>
        </div>
      )}

      {schedules.length > 0 && (
        <div className="border border-base-300 bg-base-100">
          <div className="px-5 py-4 border-b border-base-300/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
          </div>

          <div className="px-5 py-5 space-y-3">
            <p className="text-sm font-medium text-base-content">Availability Schedule</p>

            <FormField
              control={form.control}
              name="availabilityScheduleId"
              render={({ field }) => (
                <div>
                  <Select
                    value={field.value ?? '__default__'}
                    onValueChange={(v) => field.onChange(v === '__default__' ? undefined : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Use default schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="__default__">Use default schedule</SelectItem>
                      {schedules.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </div>
              )}
            />

            {/* Schedule preview */}
            {selectedSchedule && (
              <div className="flex items-center justify-between p-3 border border-base-300 bg-base-200/30">
                <div>
                  <p className="text-sm font-medium text-base-content">{selectedSchedule.name}</p>
                  {selectedSchedule.summary ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedSchedule.summary.days} · {selectedSchedule.summary.time}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">No windows configured</p>
                  )}
                </div>
                <Link
                  href="/availability"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Edit Schedule
                  <ArrowSquareOut size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 3: Booking Rules (collapsible — advanced/optional) ──── */}
      <div className="border border-base-300 bg-base-100">
        <button
          type="button"
          onClick={() => setShowBookingRules((v) => !v)}
          aria-expanded={showBookingRules}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-base-200/30"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Booking Rules
            </span>
            <span className="text-xs text-muted-foreground/70 normal-case tracking-normal">
              · advanced (optional)
            </span>
          </span>
          <CaretDown
            size={14}
            className={cn('shrink-0 text-muted-foreground transition-transform', showBookingRules && 'rotate-180')}
          />
        </button>

        {showBookingRules && (
        <div className="px-5 py-5 space-y-5 border-t border-base-300/60">

          {/* Booking Window — type selector + (rolling days | fixed range) on one row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 w-40 shrink-0">
              <span className="text-sm font-medium text-base-content">Booking Window</span>
              <InfoTip text="How far ahead invitees can book — a rolling window (next N days from today) or a fixed calendar date range." />
            </div>

            <FormField
              control={form.control}
              name="bookingWindowType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 w-44 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rolling">Rolling window</SelectItem>
                    <SelectItem value="fixed">Fixed date range</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {windowType !== 'fixed' ? (
              <FormField
                control={form.control}
                name="bookingWindow"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">next</span>
                    <div className="flex items-stretch border border-input w-24">
                      <Input
                        className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 text-sm"
                        max={365}
                        min={1}
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          field.onChange(Number.isFinite(n) ? n : field.value)
                        }}
                      />
                      <span className="flex items-center bg-base-200 px-2.5 text-xs text-muted-foreground border-l border-input shrink-0">
                        days
                      </span>
                    </div>
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="bookingRangeStart"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="h-8 w-40 text-sm"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  )}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <FormField
                  control={form.control}
                  name="bookingRangeEnd"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="h-8 w-40 text-sm"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Booking-window validation messages (range start/end) */}
          {windowType === 'fixed' && (
            <div className="pl-[172px] -mt-3">
              <FormField control={form.control} name="bookingRangeEnd" render={() => <FormMessage />} />
            </div>
          )}

          {/* Minimum Notice */}
          <FormField
            control={form.control}
            name="minimumNotice"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-40 shrink-0">
                  <span className="text-sm font-medium text-base-content">Minimum Notice</span>
                  <InfoTip text="Minimum lead time required before someone can book. E.g. 60 min means no same-hour bookings." />
                </div>
                <div className="flex items-stretch border border-input w-28">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 text-sm"
                    max={1440}
                    min={0}
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="flex items-center bg-base-200 px-2.5 text-xs text-muted-foreground border-l border-input shrink-0">
                    min
                  </span>
                </div>
                <FormMessage />
              </div>
            )}
          />

          {/* Buffer Before */}
          <FormField
            control={form.control}
            name="bufferBefore"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-40 shrink-0">
                  <span className="text-sm font-medium text-base-content">Buffer Before</span>
                  <InfoTip text="Blocked time before each meeting starts, so you can prepare." />
                </div>
                <div className="flex items-stretch border border-input w-28">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 text-sm"
                    max={120}
                    min={0}
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="flex items-center bg-base-200 px-2.5 text-xs text-muted-foreground border-l border-input shrink-0">
                    min
                  </span>
                </div>
                <FormMessage />
              </div>
            )}
          />

          {/* Buffer After */}
          <FormField
            control={form.control}
            name="bufferAfter"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-40 shrink-0">
                  <span className="text-sm font-medium text-base-content">Buffer After</span>
                  <InfoTip text="Blocked time after each meeting ends, so you can wrap up." />
                </div>
                <div className="flex items-stretch border border-input w-28">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 text-sm"
                    max={120}
                    min={0}
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="flex items-center bg-base-200 px-2.5 text-xs text-muted-foreground border-l border-input shrink-0">
                    min
                  </span>
                </div>
                <FormMessage />
              </div>
            )}
          />

          {/* Buffer time visual timeline */}
          {(bufferBefore > 0 || bufferAfter > 0) && (() => {
            const meetingMin = defaultDuration || 30
            const total = bufferBefore + meetingMin + bufferAfter
            const beforePct = Math.round((bufferBefore / total) * 100)
            const meetingPct = Math.round((meetingMin / total) * 100)
            const afterPct = 100 - beforePct - meetingPct
            return (
              <div className="pt-1">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Timeline preview</p>
                <div className="flex h-8 w-full overflow-hidden text-2xs font-semibold">
                  {bufferBefore > 0 && (
                    <div
                      style={{ width: `${beforePct}%` }}
                      className="flex items-center justify-center bg-amber-500/10 text-amber-700 border border-amber-500/20 shrink-0"
                    >
                      {bufferBefore}m
                    </div>
                  )}
                  <div
                    style={{ width: `${meetingPct}%` }}
                    className="flex items-center justify-center bg-primary/15 text-primary border border-primary/30 shrink-0 min-w-0"
                  >
                    <span className="truncate px-1">Meeting {meetingMin}m</span>
                  </div>
                  {bufferAfter > 0 && (
                    <div
                      style={{ width: `${afterPct}%` }}
                      className="flex items-center justify-center bg-amber-500/10 text-amber-700 border border-amber-500/20 shrink-0"
                    >
                      {bufferAfter}m
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground/70">
                  {bufferBefore > 0 && bufferAfter > 0
                    ? `${bufferBefore}m prep + ${meetingMin}m meeting + ${bufferAfter}m wrap-up = ${total}m blocked`
                    : bufferBefore > 0
                    ? `${bufferBefore}m prep + ${meetingMin}m meeting = ${total}m blocked`
                    : `${meetingMin}m meeting + ${bufferAfter}m wrap-up = ${total}m blocked`}
                </p>
              </div>
            )
          })()}

          {/* Max bookings per day */}
          <FormField
            control={form.control}
            name="maxBookingsPerDay"
            render={({ field }) => (
              <div className="flex items-center gap-3 border-t border-base-300/60 pt-5">
                <div className="flex items-center gap-1.5 w-40 shrink-0">
                  <span className="text-sm font-medium text-base-content">Max per day</span>
                  <InfoTip text="Caps how many times THIS event type can be booked in a single day. Leave empty for no limit. This works alongside your global limit — whichever limit is reached first blocks further bookings." />
                </div>
                <div className="flex items-stretch border border-input w-28">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 text-sm"
                    max={100}
                    min={1}
                    type="number"
                    placeholder="∞"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      field.onChange(Number.isFinite(n) && n > 0 ? n : null)
                    }}
                  />
                  <span className="flex items-center bg-base-200 px-2.5 text-xs text-muted-foreground border-l border-input shrink-0">
                    /day
                  </span>
                </div>
                <FormMessage />
              </div>
            )}
          />

          {/* Global Meeting Limits — read-only */}
          <div className="border-t border-base-300/60 pt-5">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm font-medium text-base-content">Global Meeting Limits</p>
              <InfoTip text="Counts bookings across ALL your event types combined, not just this one. Set in Availability → Advanced." />
            </div>
            <p className="text-sm text-muted-foreground">
              {limits.length > 0
                ? limits.map((l) => `${l.count} per ${l.period}`).join(', ')
                : 'No global limits set.'
              }
              {' — '}
              <Link href="/availability" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Manage in Availability <ArrowSquareOut size={11} />
              </Link>
            </p>

            {/* Explain how per-event and global limits interact */}
            {maxPerDay != null && limits.some((l) => l.period === 'day') && (
              <p className="mt-2 border-l-2 border-primary/40 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
                Both limits apply — the <span className="font-medium text-base-content">stricter</span> one wins.
                Here, this event is capped at{' '}
                <span className="font-medium text-base-content">{maxPerDay}/day</span> while all events share{' '}
                <span className="font-medium text-base-content">
                  {limits.find((l) => l.period === 'day')?.count}/day
                </span>
                , so at most <span className="font-medium text-base-content">{maxPerDay}</span> of this event can be
                booked per day.
              </p>
            )}
          </div>

        </div>
        )}
      </div>

    </div>
  )
}
