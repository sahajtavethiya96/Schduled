'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Globe } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TimeCombobox } from '@/components/ui/time-combobox'
import { saveAvailabilityStep } from '@/app/actions/onboarding'
import { normalizeTzName } from '@/lib/utils'

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`
}

function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
}

type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday'

type DaySchedule = { enabled: boolean; startTime: string; endTime: string }

const DAYS: { key: DayOfWeek; letter: string; label: string }[] = [
  { key: 'sunday',    letter: 'S', label: 'Sunday' },
  { key: 'monday',    letter: 'M', label: 'Monday' },
  { key: 'tuesday',   letter: 'T', label: 'Tuesday' },
  { key: 'wednesday', letter: 'W', label: 'Wednesday' },
  { key: 'thursday',  letter: 'T', label: 'Thursday' },
  { key: 'friday',    letter: 'F', label: 'Friday' },
  { key: 'saturday',  letter: 'S', label: 'Saturday' },
]

const DEFAULT: Record<DayOfWeek, DaySchedule> = {
  monday:    { enabled: true,  startTime: '09:00', endTime: '17:00' },
  tuesday:   { enabled: true,  startTime: '09:00', endTime: '17:00' },
  wednesday: { enabled: true,  startTime: '09:00', endTime: '17:00' },
  thursday:  { enabled: true,  startTime: '09:00', endTime: '17:00' },
  friday:    { enabled: true,  startTime: '09:00', endTime: '17:00' },
  saturday:  { enabled: false, startTime: '09:00', endTime: '17:00' },
  sunday:    { enabled: false, startTime: '09:00', endTime: '17:00' },
}

interface StepAvailabilityProps {
  onNext: () => void
  onBack: () => void
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <TimeCombobox value={value} onChange={onChange} format={fmt12} triggerClassName="w-[92px]" />
  )
}

export function StepAvailability({ onNext, onBack }: StepAvailabilityProps) {
  const [schedule, setSchedule] = useState<Record<DayOfWeek, DaySchedule>>(DEFAULT)
  const [timezone, setTimezone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setTimezone(detectTimezone()) }, [])

  function toggleDay(day: DayOfWeek) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
  }

  function updateTime(day: DayOfWeek, field: 'startTime' | 'endTime', value: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const invalidDay = Object.entries(schedule).find(
      ([, d]) => d.enabled && d.startTime >= d.endTime
    )
    if (invalidDay) {
      const label = DAYS.find((d) => d.key === invalidDay[0])?.label ?? invalidDay[0]
      setError(`${label}: end time must be after start time.`)
      setSaving(false)
      return
    }
    const result = await saveAvailabilityStep(schedule)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    onNext()
  }

  const tzDisplay = normalizeTzName(timezone)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Day rows */}
      <div className="space-y-3">
        {DAYS.map(({ key, letter, label }) => {
          const day = schedule[key]
          return (
            <div key={key} className="flex items-center gap-3" aria-label={label}>
              {/* Day badge */}
              <div
                className={[
                  'flex size-8 shrink-0 items-center justify-center text-xs font-bold select-none',
                  day.enabled
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-muted-foreground',
                ].join(' ')}
              >
                {letter}
              </div>

              {day.enabled ? (
                <>
                  {/* Time range */}
                  <div className="flex flex-1 items-center gap-2">
                    <TimeSelect
                      value={day.startTime}
                      onChange={(v) => updateTime(key, 'startTime', v)}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <TimeSelect
                      value={day.endTime}
                      onChange={(v) => updateTime(key, 'endTime', v)}
                    />
                  </div>

                  {/* Remove slot */}
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    aria-label={`Remove ${label}`}
                    className="shrink-0 p-1 text-muted-foreground transition hover:text-base-content hover:bg-base-200"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-muted-foreground">Unavailable</span>

                  {/* Add slot */}
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    aria-label={`Add hours for ${label}`}
                    className="shrink-0 p-1 text-muted-foreground transition hover:text-base-content hover:bg-base-200"
                  >
                    <Plus size={15} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Timezone hint */}
      {timezone && (
        <div className="flex items-center gap-2 border-t border-base-300 pt-4 text-sm text-muted-foreground">
          <Globe size={15} className="shrink-0 text-primary" />
          <span className="truncate">{tzDisplay}</span>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </form>
  )
}
