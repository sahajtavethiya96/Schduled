'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, ArrowsClockwise, ArrowSquareOut,
  CalendarBlank, CalendarCheck, CaretDown, CheckCircle,
  Clock, Copy, Globe, List, MagnifyingGlass, PencilSimple, Plus, Star, Trash, X,
} from '@phosphor-icons/react'
import {
  updateAvailabilitySchedule,
  addAvailabilityOverride,
  deleteAvailabilityOverride,
  createDefaultSchedule,
  createSchedule,
  duplicateSchedule,
  renameSchedule,
  setDefaultSchedule,
  deleteSchedule,
  updateUserTimezone,
  addMeetingLimit,
  removeMeetingLimit,
  updateMeetingLimit,
  type DayOfWeek,
  type TimeSlot,
  type ScheduleData,
  type OverrideData,
  type MeetingLimitPeriod,
  type MeetingLimitRow,
} from '@/app/actions/availability'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TimeCombobox } from '@/components/ui/time-combobox'
import { CountryCombobox } from '@/components/ui/country-combobox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, normalizeTzName } from '@/lib/utils'

// ── Time helpers ──────────────────────────────────────────────────────────────

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function todayISO() {
  // Local calendar date (not UTC) — the calendar cells are rendered in the
  // user's local time, so "today"/past must be computed locally too.
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
function dateToISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function jsDay(iso: string) {
  const [y, mo, d] = iso.split('-').map(Number)
  return new Date(y, mo - 1, d).getDay()
}
function fmtDate(iso: string) {
  const [y, mo, d] = iso.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const DAY_MAP: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// ── Timezone helpers ──────────────────────────────────────────────────────────

const COMMON_TZ = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Atlantic/Reykjavik',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
]

const ALL_TZ: string[] = (() => {
  try { return Intl.supportedValuesOf('timeZone') } catch { return COMMON_TZ }
})()

function getTzLabel(tz: string) {
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZoneName: 'short', timeZone: tz })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? ''
    return `(${offset}) ${normalizeTzName(tz)}`
  } catch { return normalizeTzName(tz) }
}

// ── Day config ────────────────────────────────────────────────────────────────

const DAYS: { key: DayOfWeek; letter: string; label: string }[] = [
  { key: 'sunday',    letter: 'S', label: 'Sunday' },
  { key: 'monday',    letter: 'M', label: 'Monday' },
  { key: 'tuesday',   letter: 'T', label: 'Tuesday' },
  { key: 'wednesday', letter: 'W', label: 'Wednesday' },
  { key: 'thursday',  letter: 'T', label: 'Thursday' },
  { key: 'friday',    letter: 'F', label: 'Friday' },
  { key: 'saturday',  letter: 'S', label: 'Saturday' },
]

// ── Holidays ──────────────────────────────────────────────────────────────────
// Countries + public-holiday dates come from the server (date-holidays, ~200
// countries, computed for the current year) — see lib/holidays.ts and
// /api/holidays. The picker defaults to the country implied by the user's
// timezone; changing it fetches that country's holidays.

interface HolidayItem { date: string; name: string }
interface HolidayCountry { code: string; name: string }

// ── Types ─────────────────────────────────────────────────────────────────────

type WeekGrid = Record<DayOfWeek, TimeSlot[]>
type PageTab = 'schedules' | 'calendar' | 'advanced'
type ViewMode = 'list' | 'calendar'

interface Props {
  initialSchedules: ScheduleData[]
  initialOverrides: OverrideData[]
  initialMeetingLimits: MeetingLimitRow[]
  userTimezone: string
  holidayCountryList: HolidayCountry[]
  defaultHolidayCountry: string
  initialHolidays: HolidayItem[]
}

interface ScheduleMeta {
  id: string
  name: string
  isDefault: boolean
}

const EMPTY_GRID: WeekGrid = {
  monday: [{ startTime: '09:00', endTime: '17:00' }],
  tuesday: [{ startTime: '09:00', endTime: '17:00' }],
  wednesday: [{ startTime: '09:00', endTime: '17:00' }],
  thursday: [{ startTime: '09:00', endTime: '17:00' }],
  friday: [{ startTime: '09:00', endTime: '17:00' }],
  saturday: [],
  sunday: [],
}

// ── Slot validation ───────────────────────────────────────────────────────────
// Times are "HH:MM" strings, so lexical comparison is correct within a day.

function validateSlots(slots: TimeSlot[]): string | null {
  for (const s of slots) {
    if (!s.startTime || !s.endTime) return 'Please set both a start and end time.'
    if (s.endTime <= s.startTime) return 'Each interval must end after it starts.'
  }
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return 'Time intervals cannot overlap.'
    }
  }
  return null
}

// A newly added interval defaults to right after the day's latest interval
// ends, so it never collides with what's already there (matches Calendly).
function nextIntervalDefaults(existing: TimeSlot[]): TimeSlot {
  if (existing.length === 0) return { startTime: '09:00', endTime: '17:00' }
  const lastEnd = existing.reduce((max, s) => (s.endTime > max ? s.endTime : max), '00:00')
  const [h, m] = lastEnd.split(':').map(Number)
  const endMinutes = Math.min(h * 60 + m + 60, 23 * 60 + 59)
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
  return { startTime: lastEnd, endTime }
}

// ── Shared time select ────────────────────────────────────────────────────────

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <TimeCombobox value={value} onChange={onChange} format={fmt12} label={label} />
  )
}

// ── Override dialog ───────────────────────────────────────────────────────────

function OverrideDialog({
  open, onClose, defaultDate, weekGrid, overrideMap, onApply, isPending,
}: {
  open: boolean
  onClose: () => void
  defaultDate: string
  weekGrid: WeekGrid
  overrideMap: Map<string, OverrideData>
  onApply: (date: string, isBlocked: boolean, slots: TimeSlot[], reason: string) => void
  isPending: boolean
}) {
  const [selDate, setSelDate] = useState(defaultDate || todayISO())
  const [isBlocked, setIsBlocked] = useState(false)
  const [reason, setReason] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([{ startTime: '09:00', endTime: '17:00' }])
  const [cursor, setCursor] = useState(() => {
    const base = defaultDate || todayISO()
    const [y, m] = base.split('-').map(Number)
    return { year: y, month: m - 1 }
  })

  function loadDate(iso: string) {
    setSelDate(iso)
    const existing = overrideMap.get(iso)
    if (existing) {
      setIsBlocked(existing.isBlocked)
      setReason(existing.reason ?? '')
      setSlots(existing.isBlocked || existing.slots.length === 0
        ? [{ startTime: '09:00', endTime: '17:00' }]
        : existing.slots.map((s) => ({ ...s })))
    } else {
      const dow = DAY_MAP[jsDay(iso)]
      const ws = weekGrid[dow]
      setIsBlocked(ws.length === 0)
      setReason('')
      setSlots(ws.length > 0 ? ws.map((s) => ({ ...s })) : [{ startTime: '09:00', endTime: '17:00' }])
    }
  }

  // Only re-run when the dialog opens for a (possibly different) date —
  // loadDate itself reads the latest overrideMap/weekGrid via closure.
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadDate is intentionally excluded, see above
  useEffect(() => {
    if (open) {
      const base = defaultDate || todayISO()
      loadDate(base)
      const [y, m] = base.split('-').map(Number)
      setCursor({ year: y, month: m - 1 })
    }
  }, [open, defaultDate])

  const today = todayISO()
  const { year, month } = cursor
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function pickDate(iso: string) {
    loadDate(iso)
  }

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm p-0 gap-0 overflow-visible max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Set date-specific hours</DialogTitle>
        <DialogDescription className="sr-only">Choose a date and set custom availability hours</DialogDescription>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <p className="font-semibold text-sm">Select the date(s) you want to assign specific hours</p>
          <DialogClose className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={15} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Calendar picker */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <button type="button"
                onClick={() => setCursor(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={14} />
              </button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <button type="button"
                onClick={() => setCursor(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="h-7 flex items-center justify-center text-2xs font-semibold text-muted-foreground">{d}</div>
              ))}
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const iso = dateToISO(year, month, day)
                const isPast = iso < today
                const isToday = iso === today
                const isSelected = iso === selDate
                const dow = DAY_MAP[new Date(year, month, day).getDay()]
                const hasWeekly = weekGrid[dow].length > 0
                const hasOverride = overrideMap.has(iso)
                return (
                  <div key={iso} className="flex flex-col items-center">
                    <button type="button" disabled={isPast} onClick={() => pickDate(iso)}
                      className={cn(
                        'h-9 w-9 flex items-center justify-center text-sm transition-colors',
                        isPast && 'text-muted-foreground/40 cursor-not-allowed',
                        !isPast && !isSelected && hasWeekly && 'border border-primary/40 text-primary hover:bg-primary/10',
                        !isPast && !isSelected && !hasWeekly && 'text-muted-foreground hover:bg-muted',
                        isSelected && 'bg-primary text-primary-foreground font-semibold',
                        hasOverride && !isSelected && 'ring-1 ring-primary',
                      )}>
                      {day}
                    </button>
                    {isToday && <span className="h-1 w-1 bg-primary rounded-full mt-0.5" />}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Hours */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">What hours are you available?</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Unavailable</span>
                <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
              </div>
            </div>

            {!isBlocked && (
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <TimeSelect value={slot.startTime} onChange={(v) => setSlots((p) => p.map((s, idx) => idx === i ? { ...s, startTime: v } : s))} />
                    <span className="text-sm text-muted-foreground">-</span>
                    <TimeSelect value={slot.endTime} onChange={(v) => setSlots((p) => p.map((s, idx) => idx === i ? { ...s, endTime: v } : s))} />
                    {slots.length > 1 && (
                      <button type="button" onClick={() => setSlots((p) => p.filter((_, idx) => idx !== i))}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X size={14} />
                      </button>
                    )}
                    {i === slots.length - 1 && (
                      <button type="button"
                        onClick={() => setSlots((p) => [...p, nextIntervalDefaults(p)])}
                        className="h-9 w-9 flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors shrink-0"
                        aria-label="Add interval">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isBlocked && <p className="text-sm text-muted-foreground">This date will be marked as unavailable.</p>}

            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-semibold text-muted-foreground">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder="e.g. Public holiday, vacation…"
                className="w-full border border-input bg-background px-3 h-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end gap-2 bg-background">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={isPending || !selDate}
            onClick={() => onApply(selDate, isBlocked, isBlocked ? [] : slots, reason.trim())}>
            {isPending ? 'Saving…' : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Weekday (recurring) dialog ──────────────────────────────────────────────────
// Edits the WEEKLY recurring hours for one day-of-week — i.e. "Edit all Wednesdays".

function WeekdayDialog({
  open, onClose, dow, weekGrid, onApply, isPending,
}: {
  open: boolean
  onClose: () => void
  dow: DayOfWeek | null
  weekGrid: WeekGrid
  onApply: (dow: DayOfWeek, slots: TimeSlot[]) => void
  isPending: boolean
}) {
  const label = DAYS.find((d) => d.key === dow)?.label ?? ''
  const [slots, setSlots] = useState<TimeSlot[]>([{ startTime: '09:00', endTime: '17:00' }])
  const [isBlocked, setIsBlocked] = useState(false)

  // Sync the slot editor to the selected weekday whenever the dialog opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only on open/dow change
  useEffect(() => {
    if (!open || !dow) return
    const ws = weekGrid[dow]
    setIsBlocked(ws.length === 0)
    setSlots(ws.length > 0 ? ws.map((s) => ({ ...s })) : [{ startTime: '09:00', endTime: '17:00' }])
  }, [open, dow])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm p-0 gap-0 overflow-visible">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-bold">
            {label} availability
          </DialogTitle>
          <DialogClose className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={15} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Edit your recurring weekly hours for every {label}
        </DialogDescription>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">What hours are you available?</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Unavailable</span>
              <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
            </div>
          </div>

          {!isBlocked && (
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TimeSelect value={slot.startTime} onChange={(v) => setSlots((p) => p.map((s, idx) => idx === i ? { ...s, startTime: v } : s))} />
                  <span className="text-sm text-muted-foreground">-</span>
                  <TimeSelect value={slot.endTime} onChange={(v) => setSlots((p) => p.map((s, idx) => idx === i ? { ...s, endTime: v } : s))} />
                  {slots.length > 1 && (
                    <button type="button" onClick={() => setSlots((p) => p.filter((_, idx) => idx !== i))}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X size={14} />
                    </button>
                  )}
                  {i === slots.length - 1 && (
                    <button type="button"
                      onClick={() => setSlots((p) => [...p, nextIntervalDefaults(p)])}
                      className="h-9 w-9 flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors shrink-0"
                      aria-label="Add interval">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isBlocked && <p className="text-sm text-muted-foreground">Every {label} will be marked unavailable.</p>}
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end gap-2 bg-background">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={isPending || !dow}
            onClick={() => dow && onApply(dow, isBlocked ? [] : slots)}>
            {isPending ? 'Saving…' : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Full calendar grid ────────────────────────────────────────────────────────

function FullCalendarView({ grid, overrides, currentTz, onTzClick, onEditDate, onEditWeekday }: {
  grid: WeekGrid
  overrides: OverrideData[]
  currentTz: string
  onTzClick: () => void
  onEditDate: (date: string) => void
  onEditWeekday: (dow: DayOfWeek) => void
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [menuDate, setMenuDate] = useState<string | null>(null)
  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideData>()
    for (const o of overrides) m.set(o.date, o)
    return m
  }, [overrides])

  const { year, month } = cursor
  const today = todayISO()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const allCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const weeks: (number | null)[][] = []
  for (let i = 0; i < allCells.length; i += 7) {
    const w = allCells.slice(i, i + 7)
    while (w.length < 7) w.push(null)
    weeks.push(w)
  }

  return (
    <div className="overflow-x-auto">
    <div className="border border-border min-w-[560px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCursor(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={14} /></button>
          <span className="text-sm font-semibold w-32 text-center">{monthLabel}</span>
          <button type="button" onClick={() => setCursor(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><ArrowRight size={14} /></button>
        </div>
        <button type="button" onClick={onTzClick}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
          <Globe size={13} />{normalizeTzName(currentTz)}<CaretDown size={11} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/20">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0">{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0" style={{ minHeight: 90 }}>
          {week.map((day, di) => {
            if (!day) return (
              <div key={`e-${wi}-${di}`} className="border-r border-border last:border-r-0 bg-muted/10 p-2 text-muted-foreground/30 text-sm" />
            )
            const iso = dateToISO(year, month, day)
            const isToday = iso === today
            const isPast = iso < today
            const override = overrideMap.get(iso)
            const dow = DAY_MAP[new Date(year, month, day).getDay()]
            const weekdayLabel = DAYS.find((d) => d.key === dow)?.label ?? ''
            const weeklySlots = grid[dow]
            const displaySlots = override
              ? (override.isBlocked ? [] : override.slots)
              : weeklySlots

            const cellInner = (
              <>
                <div className="flex items-start justify-between mb-1">
                  <span className={cn('text-sm leading-none',
                    isToday ? 'font-bold text-primary' : isPast ? 'text-muted-foreground/40' : 'text-foreground'
                  )}>{day}</span>
                  {!isPast && (
                    override
                      ? <CalendarCheck size={12} className="text-primary mt-0.5" weight="fill" />
                      : weeklySlots.length > 0
                        ? <ArrowsClockwise size={12} className="text-muted-foreground/35 mt-0.5 transition-colors group-hover:text-primary/60" />
                        : null
                  )}
                </div>
                <div className="space-y-0.5">
                  {displaySlots.map((s, i) => (
                    <p key={i} className={cn('text-xs leading-snug',
                      override ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
                  ))}
                  {override?.isBlocked && <p className="text-xs text-destructive/60">Unavailable</p>}
                </div>
              </>
            )

            // Past days are read-only — no menu
            if (isPast) {
              return (
                <div key={iso} className="border-r border-border last:border-r-0 bg-muted/10 p-2 text-left cursor-default">
                  {cellInner}
                </div>
              )
            }

            return (
              <Popover key={iso} open={menuDate === iso} onOpenChange={(o) => setMenuDate(o ? iso : null)}>
                <PopoverTrigger asChild>
                  <button type="button"
                    className={cn(
                      'border-r border-border last:border-r-0 p-2 text-left transition-colors group hover:bg-primary/5 cursor-pointer w-full',
                      isToday && 'border-t-2 border-t-primary',
                      override && 'bg-primary/5',
                      menuDate === iso && 'bg-primary/10',
                    )}>
                    {cellInner}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={4} className="w-56 gap-0 p-1">
                  <button type="button"
                    onClick={() => { setMenuDate(null); onEditDate(iso) }}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                    <CalendarBlank size={15} className="shrink-0 text-muted-foreground" />
                    Edit date
                  </button>
                  <button type="button"
                    onClick={() => { setMenuDate(null); onEditWeekday(dow) }}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                    <ArrowsClockwise size={15} className="shrink-0 text-muted-foreground" />
                    Edit all <span className="font-semibold">{weekdayLabel}s</span>
                  </button>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      ))}
    </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AvailabilityForm({ initialSchedules, initialOverrides, initialMeetingLimits, userTimezone, holidayCountryList, defaultHolidayCountry, initialHolidays }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pageTab, setPageTab] = useState<PageTab>('schedules')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // ── Multi-schedule state ────────────────────────────────────────────────────
  const firstSchedule = initialSchedules.find((s) => s.isDefault) ?? initialSchedules[0] ?? null
  const [schedules, setSchedules] = useState<ScheduleMeta[]>(
    initialSchedules.map((s) => ({ id: s.id, name: s.name, isDefault: s.isDefault }))
  )
  // Per-schedule weekly grids, cached so switching is instant.
  const [gridsById, setGridsById] = useState<Record<string, WeekGrid>>(() =>
    Object.fromEntries(initialSchedules.map((s) => [s.id, s.windows]))
  )

  const [scheduleId, setScheduleId] = useState<string | null>(firstSchedule?.id ?? null)
  const [scheduleName, setScheduleName] = useState(firstSchedule?.name ?? 'Working Hours')
  const [grid, setGrid] = useState<WeekGrid>(firstSchedule?.windows ?? EMPTY_GRID)
  const [scheduleEdited, setScheduleEdited] = useState(false)
  // Schedule ids with unsaved weekly-hour edits (so switching back re-enables Save).
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set())

  const activeIsDefault = schedules.find((s) => s.id === scheduleId)?.isDefault ?? false

  // Schedule name dialog (create / rename) + delete confirmation
  const [nameDialog, setNameDialog] = useState<{ mode: 'new' | 'rename' } | null>(null)
  const [nameValue, setNameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [overrides, setOverrides] = useState<OverrideData[]>(initialOverrides)
  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideData>()
    for (const o of overrides) m.set(o.date, o)
    return m
  }, [overrides])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState(todayISO())

  const [weekdayDialogOpen, setWeekdayDialogOpen] = useState(false)
  const [weekdayDow, setWeekdayDow] = useState<DayOfWeek | null>(null)

  const [tzDialogOpen, setTzDialogOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState('')
  const [currentTz, setCurrentTz] = useState(userTimezone)

  // Advanced tab
  const [advName, setAdvName] = useState(firstSchedule?.name ?? 'Working Hours')
  const [holidayCountry, setHolidayCountry] = useState(defaultHolidayCountry)
  const [holidays, setHolidays] = useState<HolidayItem[]>(initialHolidays)
  const [holidaysLoading, setHolidaysLoading] = useState(false)

  // Fetch the selected country's public holidays from the server. The default
  // country is primed from props (SSR), so only re-fetch when the user changes it.
  useEffect(() => {
    if (holidayCountry === defaultHolidayCountry) return
    let cancelled = false
    setHolidaysLoading(true)
    fetch(`/api/holidays?country=${encodeURIComponent(holidayCountry)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setHolidays(data.holidays ?? []) })
      .catch(() => { if (!cancelled) setHolidays([]) })
      .finally(() => { if (!cancelled) setHolidaysLoading(false) })
    return () => { cancelled = true }
  }, [holidayCountry, defaultHolidayCountry])
  const [meetingLimits, setMeetingLimits] = useState<MeetingLimitRow[]>(initialMeetingLimits)
  const [limitPeriod, setLimitPeriod] = useState<MeetingLimitPeriod>('day')
  const [limitCount, setLimitCount] = useState('4')
  const [limitPending, startLimitTransition] = useTransition()

  // ── Grid mutations ──────────────────────────────────────────────────────────

  // Mark the active schedule dirty. dirtyIds lets us restore the correct
  // "unsaved" state when switching back to a schedule with cached edits.
  function markActiveDirty() {
    setScheduleEdited(true)
    if (scheduleId) setDirtyIds((prev) => new Set(prev).add(scheduleId))
  }

  // Immediately persists a weekly grid to the server (used for the +/X interval
  // controls, which save on click instead of waiting for the Schedule Save button).
  async function autosaveGrid(nextGrid: WeekGrid, successMessage: string) {
    for (const [day, daySlots] of Object.entries(nextGrid)) {
      const err = validateSlots(daySlots)
      if (err) {
        const label = DAYS.find((d) => d.key === day)?.label ?? day
        toast.error(`${label}: ${err}`)
        return
      }
    }
    let savedId = scheduleId
    if (!savedId) {
      const res = await createDefaultSchedule()
      if ('error' in res) { toast.error(res.error); return }
      savedId = res.id
      setScheduleId(res.id)
      setSchedules((prev) =>
        prev.length === 0 ? [{ id: res.id, name: scheduleName, isDefault: true }] : prev
      )
    }
    const res = await updateAvailabilitySchedule(savedId, scheduleName, nextGrid)
    if ('error' in res) { toast.error(res.error); return }
    setGridsById((prev) => ({ ...prev, [savedId!]: nextGrid }))
    setScheduleEdited(false)
    setDirtyIds((prev) => {
      const next = new Set(prev)
      next.delete(savedId!)
      return next
    })
    toast.success(successMessage)
  }

  function setDay(day: DayOfWeek, enabled: boolean) {
    const nextGrid = { ...grid, [day]: enabled ? [{ startTime: '09:00', endTime: '17:00' } as TimeSlot] : [] }
    setGrid(nextGrid)
    markActiveDirty()
    const label = DAYS.find((d) => d.key === day)?.label ?? day
    startTransition(() => autosaveGrid(nextGrid, enabled ? `${label} enabled` : `${label} marked unavailable`))
  }
  function addSlot(day: DayOfWeek) {
    const nextGrid = { ...grid, [day]: [...grid[day], nextIntervalDefaults(grid[day])] }
    setGrid(nextGrid)
    markActiveDirty()
    startTransition(() => autosaveGrid(nextGrid, 'Time interval added'))
  }
  function removeSlot(day: DayOfWeek, index: number) {
    const nextGrid = { ...grid, [day]: grid[day].filter((_, i) => i !== index) }
    setGrid(nextGrid)
    markActiveDirty()
    startTransition(() => autosaveGrid(nextGrid, 'Time interval removed'))
  }
  function updateSlot(day: DayOfWeek, index: number, field: 'startTime' | 'endTime', value: string) {
    const slots = [...grid[day]]
    slots[index] = { ...slots[index], [field]: value }
    const nextGrid = { ...grid, [day]: slots }
    setGrid(nextGrid)
    markActiveDirty()
    startTransition(() => autosaveGrid(nextGrid, 'Time updated'))
  }

  // ── Multi-schedule handlers ───────────────────────────────────────────────────

  function switchSchedule(id: string) {
    if (id === scheduleId) return
    const target = schedules.find((s) => s.id === id)
    if (!target) return
    // Preserve any in-progress edits for the current schedule in the cache.
    if (scheduleId) setGridsById((prev) => ({ ...prev, [scheduleId]: grid }))
    setScheduleId(id)
    setScheduleName(target.name)
    setAdvName(target.name)
    setGrid(gridsById[id] ?? EMPTY_GRID)
    // Restore the unsaved state for the target so its Save button stays usable.
    setScheduleEdited(dirtyIds.has(id))
  }

  function openNewScheduleDialog() {
    setNameValue('New schedule')
    setNameDialog({ mode: 'new' })
  }

  function openRenameDialog() {
    if (!scheduleId) return
    setNameValue(scheduleName)
    setNameDialog({ mode: 'rename' })
  }

  function confirmNameDialog() {
    const name = nameValue.trim()
    if (!name) { toast.error('Name is required'); return }
    const mode = nameDialog?.mode
    startTransition(async () => {
      if (mode === 'new') {
        const res = await createSchedule(name)
        if ('error' in res) { toast.error(res.error); return }
        const seeded: WeekGrid = JSON.parse(JSON.stringify(EMPTY_GRID))
        if (scheduleId) setGridsById((prev) => ({ ...prev, [scheduleId]: grid }))
        setGridsById((prev) => ({ ...prev, [res.id]: seeded }))
        setSchedules((prev) => [...prev, { id: res.id, name, isDefault: prev.length === 0 }])
        setScheduleId(res.id)
        setScheduleName(name)
        setAdvName(name)
        setGrid(seeded)
        setScheduleEdited(false)
        toast.success('Schedule created')
      } else if (mode === 'rename' && scheduleId) {
        const res = await renameSchedule(scheduleId, name)
        if ('error' in res) { toast.error(res.error); return }
        setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, name } : s)))
        setScheduleName(name)
        setAdvName(name)
        toast.success('Schedule renamed')
      }
      setNameDialog(null)
    })
  }

  function handleDuplicateSchedule() {
    if (!scheduleId) return
    // Duplicate copies the SAVED hours on the server, so block while there are
    // unsaved edits to avoid the copy diverging from what's shown.
    if (scheduleEdited) { toast.error('Save your changes before duplicating.'); return }
    const sourceId = scheduleId
    startTransition(async () => {
      const res = await duplicateSchedule(sourceId)
      if ('error' in res) { toast.error(res.error); return }
      const copyName = `${scheduleName} (copy)`
      const copyGrid: WeekGrid = JSON.parse(JSON.stringify(gridsById[sourceId] ?? grid))
      setGridsById((prev) => ({ ...prev, [res.id]: copyGrid }))
      setSchedules((prev) => [...prev, { id: res.id, name: copyName, isDefault: false }])
      setScheduleId(res.id)
      setScheduleName(copyName)
      setAdvName(copyName)
      setGrid(copyGrid)
      setScheduleEdited(false)
      toast.success('Schedule duplicated')
    })
  }

  function handleSetDefaultSchedule() {
    if (!scheduleId || activeIsDefault) return
    const id = scheduleId
    startTransition(async () => {
      const res = await setDefaultSchedule(id)
      if ('error' in res) { toast.error(res.error); return }
      setSchedules((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })))
      toast.success('Default schedule updated')
    })
  }

  function confirmDeleteSchedule() {
    if (!scheduleId) return
    if (schedules.length <= 1) { toast.error('You must keep at least one schedule.'); return }
    const id = scheduleId
    setDeleteOpen(false)
    startTransition(async () => {
      const res = await deleteSchedule(id)
      if ('error' in res) { toast.error(res.error); return }
      const remaining = schedules.filter((s) => s.id !== id)
      const wasDefault = schedules.find((s) => s.id === id)?.isDefault
      if (wasDefault && remaining.length > 0 && !remaining.some((s) => s.isDefault)) {
        // Promote the alphabetically-first remaining schedule — must match the
        // server's deterministic choice in deleteSchedule so the default star
        // doesn't jump after a refresh.
        const promoted = [...remaining].sort((a, b) => a.name.localeCompare(b.name))[0]
        const idx = remaining.findIndex((s) => s.id === promoted.id)
        remaining[idx] = { ...remaining[idx], isDefault: true }
      }
      setSchedules(remaining)
      setGridsById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      const nextActive = remaining.find((s) => s.isDefault) ?? remaining[0]
      setScheduleId(nextActive?.id ?? null)
      setScheduleName(nextActive?.name ?? 'Working Hours')
      setAdvName(nextActive?.name ?? 'Working Hours')
      setGrid(nextActive ? gridsById[nextActive.id] ?? EMPTY_GRID : EMPTY_GRID)
      setScheduleEdited(false)
      toast.success('Schedule deleted')
    })
  }

  // ── Override apply ──────────────────────────────────────────────────────────

  function handleApplyOverride(date: string, isBlocked: boolean, slots: TimeSlot[], reason: string) {
    if (!isBlocked) {
      const err = validateSlots(slots)
      if (err) { toast.error(err); return }
    }
    startTransition(async () => {
      const dow = DAY_MAP[jsDay(date)]
      const weeklySlots = grid[dow]
      const matchesWeekly = !isBlocked && !reason && slots.length === weeklySlots.length &&
        slots.every((s, i) => s.startTime === weeklySlots[i]?.startTime && s.endTime === weeklySlots[i]?.endTime)

      if (matchesWeekly) {
        const existing = overrideMap.get(date)
        if (existing) {
          const res = await deleteAvailabilityOverride(date)
          if ('error' in res) { toast.error(res.error); return }
          setOverrides((prev) => prev.filter((o) => o.date !== date))
          toast.success('Override removed')
        }
        setDialogOpen(false)
        return
      }

      const res = await addAvailabilityOverride({ date, isBlocked, slots: isBlocked ? [] : slots, reason: reason || undefined })
      if ('error' in res) { toast.error(res.error); return }

      setOverrides((prev) => {
        const without = prev.filter((o) => o.date !== date)
        return [...without, { date, isBlocked, slots: isBlocked ? [] : slots, reason: reason || null }]
          .sort((a, b) => a.date.localeCompare(b.date))
      })
      setDialogOpen(false)
      toast.success('Date override saved')
    })
  }

  function handleDeleteOverride(date: string) {
    startTransition(async () => {
      const res = await deleteAvailabilityOverride(date)
      if ('error' in res) { toast.error(res.error); return }
      setOverrides((prev) => prev.filter((o) => o.date !== date))
      toast.success('Override removed')
    })
  }

  function openDialog(date?: string) {
    setDialogDate(date ?? todayISO())
    setDialogOpen(true)
  }

  // ── Weekday (recurring) editing from the calendar ────────────────────────────
  function openWeekdayDialog(dow: DayOfWeek) {
    setWeekdayDow(dow)
    setWeekdayDialogOpen(true)
  }

  function handleApplyWeekday(dow: DayOfWeek, slots: TimeSlot[]) {
    const err = validateSlots(slots)
    if (err) { toast.error(err); return }
    // Update the weekly grid for this day-of-week, then persist the schedule.
    const nextGrid: WeekGrid = { ...grid, [dow]: slots }
    setGrid(nextGrid)
    setWeekdayDialogOpen(false)
    startTransition(async () => {
      const name = scheduleName
      let id = scheduleId
      if (!id) {
        const res = await createDefaultSchedule()
        if ('error' in res) { toast.error(res.error); return }
        id = res.id
        setScheduleId(id)
      }
      const res = await updateAvailabilitySchedule(id, name, nextGrid)
      if ('error' in res) { toast.error(res.error); return }
      setScheduleEdited(false)
      toast.success(`${DAYS.find((d) => d.key === dow)?.label ?? 'Day'} hours updated`)
    })
  }

  function handleHolidayToggle(date: string, block: boolean) {
    // Optimistic update — apply immediately so the switch doesn't flicker back
    setOverrides((prev) => {
      if (block) {
        const without = prev.filter((o) => o.date !== date)
        return [...without, { date, isBlocked: true, slots: [], reason: null }]
          .sort((a, b) => a.date.localeCompare(b.date))
      }
      return prev.filter((o) => o.date !== date)
    })

    startTransition(async () => {
      if (block) {
        const res = await addAvailabilityOverride({ date, isBlocked: true, slots: [] })
        if ('error' in res) {
          setOverrides((prev) => prev.filter((o) => o.date !== date)) // revert
          toast.error(res.error); return
        }
        toast.success('Holiday marked as unavailable')
      } else {
        const res = await deleteAvailabilityOverride(date)
        if ('error' in res) {
          setOverrides((prev) => { // revert
            const without = prev.filter((o) => o.date !== date)
            return [...without, { date, isBlocked: true, slots: [], reason: null }]
              .sort((a, b) => a.date.localeCompare(b.date))
          })
          toast.error(res.error); return
        }
        toast.success('Holiday override removed')
      }
    })
  }

  function handleAllHolidaysToggle(enable: boolean) {
    // Uses the `holidays` state (fetched for the selected country).
    // Snapshot the current state so we can roll back if any write fails.
    const prevOverrides = overrides

    // Optimistic update first
    setOverrides((prev) => {
      const dates = new Set(holidays.map((h) => h.date))
      if (enable) {
        const without = prev.filter((o) => !dates.has(o.date))
        return [...without, ...holidays.map((h) => ({ date: h.date, isBlocked: true, slots: [], reason: null }))]
          .sort((a, b) => a.date.localeCompare(b.date))
      }
      return prev.filter((o) => !dates.has(o.date))
    })

    startTransition(async () => {
      // addAvailabilityOverride/deleteAvailabilityOverride are idempotent
      // (they clear the date first / no-op when absent), so we can apply every
      // holiday unconditionally instead of reading a stale overrideMap.
      for (const h of holidays) {
        const res = enable
          ? await addAvailabilityOverride({ date: h.date, isBlocked: true, slots: [] })
          : await deleteAvailabilityOverride(h.date)
        if ('error' in res) {
          setOverrides(prevOverrides) // roll back the optimistic update
          toast.error(res.error)
          return
        }
      }
      toast.success(enable ? 'All holidays blocked' : 'All holiday overrides removed')
    })
  }

  // ── Timezone ────────────────────────────────────────────────────────────────

  const filteredTz = useMemo(() => {
    const q = tzSearch.toLowerCase().trim()
    if (!q) return COMMON_TZ
    const inCommon = COMMON_TZ.filter((tz) => tz.toLowerCase().includes(q) || getTzLabel(tz).toLowerCase().includes(q))
    if (inCommon.length > 0) return inCommon
    return ALL_TZ.filter((tz) => tz.toLowerCase().includes(q) || getTzLabel(tz).toLowerCase().includes(q)).slice(0, 50)
  }, [tzSearch])

  function handleTzChange(tz: string) {
    startTransition(async () => {
      const res = await updateUserTimezone(tz)
      if ('error' in res) { toast.error(res.error); return }
      setCurrentTz(tz)
      setTzDialogOpen(false)
      setTzSearch('')
      toast.success('Timezone updated')
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page tab bar */}
      <div className="border-b border-border mb-6">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            { id: 'schedules' as PageTab, label: 'Schedules' },
            { id: 'calendar' as PageTab, label: 'Calendar settings' },
            { id: 'advanced' as PageTab, label: 'Advanced settings' },
          ]).map((tab) => (
            <button key={tab.id} type="button" onClick={() => setPageTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                pageTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CALENDAR SETTINGS TAB ── */}
      {pageTab === 'calendar' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-sm font-semibold mb-1">Connected calendars</h2>
            <p className="text-sm text-muted-foreground">Connect a calendar to check for conflicts and automatically add new bookings.</p>
          </div>

          <div className="space-y-3">
            {/* Google Calendar card */}
            <div className="flex items-center justify-between border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-muted">
                  <CalendarBlank size={18} weight="fill" className="text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">Sync availability and create meeting events</p>
                </div>
              </div>
              <a href="/settings/integrations" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                Manage <ArrowSquareOut size={12} />
              </a>
            </div>

            {/* Outlook card */}
            <div className="flex items-center justify-between border border-border p-4 opacity-60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-muted">
                  <CalendarBlank size={18} className="text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Microsoft Outlook</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
              <span className="text-xs bg-muted px-2 py-1 text-muted-foreground">Soon</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Manage all integrations in{' '}
              <a href="/settings/integrations" className="text-primary hover:underline">Settings → Integrations</a>.
            </p>
          </div>
        </div>
      )}

      {/* ── ADVANCED SETTINGS TAB ── */}
      {pageTab === 'advanced' && (
        <div className="space-y-0 max-w-2xl divide-y divide-border">

          {/* Timezone */}
          <div className="pb-8">
            <h2 className="font-semibold mb-0.5">Timezone</h2>
            <p className="text-sm text-muted-foreground mb-4">All booking times are displayed in this timezone.</p>
            <button type="button" onClick={() => setTzDialogOpen(true)}
              className="flex items-center gap-2 h-9 px-3 border border-input text-sm hover:bg-muted transition-colors max-w-xs w-full text-left">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{normalizeTzName(currentTz)}</span>
              <CaretDown size={12} className="text-muted-foreground shrink-0" />
            </button>
          </div>


          {/* Meeting Limits */}
          <div className="py-8">
            <h2 className="font-semibold mb-0.5">Meeting limits</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set a maximum number of total meetings across all event types.
            </p>

            {/* Existing limits */}
            {meetingLimits.length > 0 && (
              <div className="border border-border divide-y divide-border mb-3">
                {meetingLimits.map((lim) => (
                  <div key={lim.id} className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      defaultValue={lim.count}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val !== lim.count) {
                          startLimitTransition(async () => {
                            const res = await updateMeetingLimit(lim.id, val)
                            if ('error' in res) { toast.error(res.error); return }
                            setMeetingLimits((prev) => prev.map((l) => l.id === lim.id ? { ...l, count: val } : l))
                            toast.success('Limit updated')
                          })
                        }
                      }}
                      className="w-16 h-9 border border-input bg-background px-2 text-sm text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <span className="text-sm text-muted-foreground">meetings per</span>
                    <span className="text-sm font-medium capitalize">{lim.period}</span>
                    <button
                      type="button"
                      disabled={limitPending}
                      onClick={() => startLimitTransition(async () => {
                        const res = await removeMeetingLimit(lim.id)
                        if ('error' in res) { toast.error(res.error); return }
                        setMeetingLimits((prev) => prev.filter((l) => l.id !== lim.id))
                        toast.success('Limit removed')
                      })}
                      className="ml-auto flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new limit */}
            {(['day', 'week', 'month'] as MeetingLimitPeriod[]).some(
              (p) => !meetingLimits.find((l) => l.period === p)
            ) && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={limitCount}
                  onChange={(e) => setLimitCount(e.target.value)}
                  className="w-16 h-9 border border-input bg-background px-2 text-sm text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <span className="text-sm text-muted-foreground">meetings per</span>
                <Select
                  value={limitPeriod}
                  onValueChange={(v) => setLimitPeriod(v as MeetingLimitPeriod)}
                >
                  <SelectTrigger className="w-28 h-9 text-sm capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['day', 'week', 'month'] as MeetingLimitPeriod[])
                      .filter((p) => !meetingLimits.find((l) => l.period === p))
                      .map((p) => (
                        <SelectItem key={p} value={p} className="text-sm capitalize">{p}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={limitPending || !limitCount || parseInt(limitCount) < 1}
                  className="gap-1.5"
                  onClick={() => startLimitTransition(async () => {
                    const count = parseInt(limitCount)
                    if (isNaN(count)) return
                    const res = await addMeetingLimit(limitPeriod, count)
                    if ('error' in res) { toast.error(res.error); return }
                    setMeetingLimits((prev) => [...prev, { id: res.id, period: limitPeriod, count }])
                    // Auto-select next available period
                    const taken = new Set([...meetingLimits.map(l => l.period), limitPeriod])
                    const next = (['day', 'week', 'month'] as MeetingLimitPeriod[]).find(p => !taken.has(p))
                    if (next) setLimitPeriod(next)
                    setLimitCount('4')
                    toast.success('Meeting limit added')
                  })}
                >
                  <Plus size={13} /> Add another meeting limit
                </Button>
              </div>
            )}
          </div>

          {/* Holidays */}
          <div className="py-8">
            <h2 className="font-semibold mb-0.5">Holidays</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically block public holidays as unavailable on your calendar.
            </p>

            {(() => {
              const allBlocked = holidays.length > 0 && holidays.every((h) => overrideMap.get(h.date)?.isBlocked)
              return (
                <>
                  <div className="flex items-center justify-between border border-border px-4 py-3 mb-0 bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CountryCombobox
                        value={holidayCountry}
                        options={holidayCountryList}
                        onChange={setHolidayCountry}
                        triggerClassName="w-56 font-medium"
                      />
                    </div>
                    <Switch checked={allBlocked} disabled={holidaysLoading || holidays.length === 0} onCheckedChange={handleAllHolidaysToggle} />
                  </div>

                  <div className="border border-t-0 border-border">
                    {holidaysLoading ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading holidays…</p>
                    ) : holidays.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">No public holidays found for this country.</p>
                    ) : holidays.map((h) => {
                      const isBlocked = overrideMap.get(h.date)?.isBlocked === true
                      return (
                        <div key={h.date}
                          className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
                          <div>
                            <p className="text-sm font-medium">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(h.date)}</p>
                          </div>
                          <Switch checked={isBlocked}
                            onCheckedChange={(checked) => handleHolidayToggle(h.date, checked)} />
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>

        </div>
      )}

      {/* ── SCHEDULES TAB ── */}
      {pageTab === 'schedules' && (
        <div className="space-y-5">
          {/* Schedule header bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {scheduleId && schedules.length > 0 ? (
                <Select value={scheduleId} onValueChange={switchSchedule}>
                  <SelectTrigger className="h-8 w-56 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.isDefault ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-semibold">{scheduleName}</span>
              )}

              <Button size="sm" variant="outline" onClick={openNewScheduleDialog} disabled={isPending} className="gap-1.5">
                <Plus size={13} /> New
              </Button>

              {scheduleId && (
                <Button size="sm" variant="ghost" onClick={openRenameDialog} disabled={isPending} className="gap-1.5 text-muted-foreground hover:text-foreground" title="Rename schedule">
                  <PencilSimple size={13} /> Rename
                </Button>
              )}
              {scheduleId && !activeIsDefault && (
                <Button size="sm" variant="ghost" onClick={handleSetDefaultSchedule} disabled={isPending} className="gap-1.5 text-muted-foreground hover:text-foreground" title="Set as default">
                  <Star size={13} /> Set default
                </Button>
              )}
              {scheduleId && (
                <Button size="sm" variant="ghost" onClick={handleDuplicateSchedule} disabled={isPending} className="gap-1.5 text-muted-foreground hover:text-foreground" title="Duplicate schedule">
                  <Copy size={13} /> Duplicate
                </Button>
              )}
              {scheduleId && schedules.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)} disabled={isPending} className="gap-1.5 text-muted-foreground hover:text-destructive" title="Delete schedule">
                  <Trash size={13} /> Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex border border-border overflow-hidden">
                <button type="button" onClick={() => setViewMode('list')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  <List size={13} /> List
                </button>
                <button type="button" onClick={() => setViewMode('calendar')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border transition-colors',
                    viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  <CalendarBlank size={13} /> Calendar
                </button>
              </div>
            </div>
          </div>

          {/* CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <FullCalendarView
              grid={grid} overrides={overrides} currentTz={currentTz}
              onTzClick={() => setTzDialogOpen(true)}
              onEditDate={(date) => openDialog(date)}
              onEditWeekday={(dow) => openWeekdayDialog(dow)}
            />
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 xl:items-start xl:divide-x xl:divide-border">

              {/* Left: Weekly hours */}
              <div className="space-y-4 xl:pr-10">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Weekly hours</p>
                    <p className="text-xs text-muted-foreground">Set when you are typically available for meetings</p>
                  </div>
                </div>

                <div className="space-y-0">
                  {DAYS.map(({ key, letter, label }) => {
                    const slots = grid[key]
                    const enabled = slots.length > 0

                    return (
                      <div key={key} className={cn("flex gap-3 py-2 border-b border-border/50 last:border-b-0", enabled ? "items-start" : "items-center")}>
                        {/* Day letter badge — click to toggle */}
                        <button type="button" onClick={() => setDay(key, !enabled)}
                          title={enabled ? `Disable ${label}` : `Enable ${label}`}
                          className={cn(
                            'flex size-7 shrink-0 items-center justify-center text-xs font-bold select-none transition-colors',
                            enabled ? 'mt-1' : '',
                            enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                          )}>
                          {letter}
                        </button>

                        {enabled ? (
                          <div className="flex flex-col gap-1.5 flex-1">
                            {slots.map((slot, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <TimeCombobox value={slot.startTime} onChange={(v) => updateSlot(key, i, 'startTime', v)} format={fmt12} triggerClassName="w-[105px]" />
                                <span className="text-muted-foreground text-xs shrink-0">-</span>
                                <TimeCombobox value={slot.endTime} onChange={(v) => updateSlot(key, i, 'endTime', v)} format={fmt12} triggerClassName="w-[105px]" />
                                {/* X always visible: removes slot if multiple, disables day if last slot */}
                                <button
                                  type="button"
                                  title={slots.length === 1 ? `Mark ${label} unavailable` : 'Remove this interval'}
                                  onClick={() => slots.length > 1 ? removeSlot(key, i) : setDay(key, false)}
                                  className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <X size={13} />
                                </button>
                                {/* Add slot — only on the last row */}
                                {i === slots.length - 1 && (
                                  <button type="button" onClick={() => addSlot(key)}
                                    className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0" title="Add time interval">
                                    <Plus size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-muted-foreground">Unavailable</span>
                            <button type="button" onClick={() => setDay(key, true)}
                              className="p-0.5 text-muted-foreground hover:text-primary transition-colors" title={`Add hours for ${label}`}>
                              <Plus size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>

              {/* Right: Date-specific hours */}
              <div className="space-y-4 xl:pl-10 pt-6 xl:pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={15} className="text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Date-specific hours</p>
                      <p className="text-xs text-muted-foreground">Adjust hours for specific days</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => openDialog()}>
                    <Plus size={13} /> Hours
                  </Button>
                </div>

                {overrides.length > 0 ? (
                  <div className="space-y-2">
                    {overrides.map((o) => (
                      // biome-ignore lint/a11y/useSemanticElements: contains a nested delete <button>, which a <button> wrapper can't legally contain
                      <div
                        key={o.date}
                        role="button"
                        tabIndex={0}
                        onClick={() => openDialog(o.date)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDialog(o.date) } }}
                        title="Edit this date's hours"
                        className="flex items-center justify-between border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium">{fmtDate(o.date)}</p>
                          {o.isBlocked
                            ? <span className="inline-block text-xs text-muted-foreground bg-muted px-2 py-0.5 mt-0.5">Unavailable</span>
                            : <div className="mt-0.5 space-y-0.5">
                                {o.slots.map((s, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
                                ))}
                              </div>
                          }
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteOverride(o.date) }}
                          disabled={isPending}
                          title="Delete this override"
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border py-10 flex flex-col items-center justify-center gap-2 text-center">
                    <CalendarCheck size={24} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No date-specific hours yet.</p>
                    <button type="button" onClick={() => openDialog()} className="text-xs text-primary hover:text-primary/80 transition-colors">
                      + Add an override
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Override dialog — date-specific hours ("Edit date") */}
      <OverrideDialog
        open={dialogOpen} onClose={() => setDialogOpen(false)}
        defaultDate={dialogDate} weekGrid={grid} overrideMap={overrideMap}
        onApply={handleApplyOverride} isPending={isPending}
      />

      {/* Weekday dialog — recurring weekly hours ("Edit all Wednesdays") */}
      <WeekdayDialog
        open={weekdayDialogOpen} onClose={() => setWeekdayDialogOpen(false)}
        dow={weekdayDow} weekGrid={grid}
        onApply={handleApplyWeekday} isPending={isPending}
      />

      {/* Timezone dialog */}
      <Dialog open={tzDialogOpen} onOpenChange={(open) => { setTzDialogOpen(open); if (!open) setTzSearch('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Change timezone</DialogTitle>
          <DialogDescription className="sr-only">Select your timezone</DialogDescription>
          <div className="space-y-3">
            <div className="relative">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search timezones…" value={tzSearch} onChange={(e) => setTzSearch(e.target.value)} autoFocus className="h-9 pl-9" />
            </div>
            <div className="max-h-64 overflow-y-auto border border-border">
              {filteredTz.map((tz) => (
                <button key={tz} type="button" onClick={() => handleTzChange(tz)} disabled={isPending}
                  className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between',
                    tz === currentTz && 'bg-primary/10 text-primary font-medium')}>
                  <span>{getTzLabel(tz)}</span>
                  {tz === currentTz && <CheckCircle size={14} weight="fill" />}
                </button>
              ))}
              {filteredTz.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule name dialog — create / rename */}
      <Dialog open={nameDialog !== null} onOpenChange={(open) => { if (!open) setNameDialog(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{nameDialog?.mode === 'rename' ? 'Rename schedule' : 'New schedule'}</DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === 'rename'
                ? 'Give this availability schedule a new name.'
                : 'Create a new availability schedule (starts with Mon–Fri, 9 AM–5 PM).'}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNameDialog() } }}
            placeholder="e.g. Weekend hours"
            maxLength={60}
            className="h-9"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNameDialog(null)} disabled={isPending}>Cancel</Button>
            <Button size="sm" onClick={confirmNameDialog} disabled={isPending || !nameValue.trim()}>
              {nameDialog?.mode === 'rename' ? 'Rename' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete schedule confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{scheduleName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the schedule and its weekly hours. Event types using it will fall back to your default schedule. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteSchedule}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
