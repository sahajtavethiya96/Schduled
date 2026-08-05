'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretUpDown, Check, Globe, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { saveTimezoneStep } from '@/app/actions/onboarding'

interface StepTimezoneProps {
  onNext: () => void
  onBack: () => void
}

const TIMEZONES: { label: string; value: string }[] = [
  { label: 'Adelaide — South Australia (ACST)',         value: 'Australia/Adelaide' },
  { label: 'Almaty — Kazakhstan (ALMT)',                value: 'Asia/Almaty' },
  { label: 'Amsterdam / Brussels (CET/CEST)',           value: 'Europe/Amsterdam' },
  { label: 'Athens — Greece (EET/EEST)',                value: 'Europe/Athens' },
  { label: 'Atlantic Time — Canada (AT)',               value: 'America/Halifax' },
  { label: 'Auckland — New Zealand (NZST)',             value: 'Pacific/Auckland' },
  { label: 'Baghdad — Iraq (AST)',                      value: 'Asia/Baghdad' },
  { label: 'Bangkok — Thailand (ICT)',                  value: 'Asia/Bangkok' },
  { label: 'Bogotá — Colombia (COT)',                   value: 'America/Bogota' },
  { label: 'Brisbane — Queensland (AEST)',              value: 'Australia/Brisbane' },
  { label: 'Buenos Aires — Argentina (ART)',            value: 'America/Argentina/Buenos_Aires' },
  { label: 'Cairo — Egypt (EET)',                       value: 'Africa/Cairo' },
  { label: 'Casablanca — Morocco (WET)',                value: 'Africa/Casablanca' },
  { label: 'Central Time — US & Canada (CT)',           value: 'America/Chicago' },
  { label: 'Colombo — Sri Lanka (IST)',                 value: 'Asia/Colombo' },
  { label: 'Darwin — Northern Territory (ACST)',        value: 'Australia/Darwin' },
  { label: 'Dhaka — Bangladesh (BST)',                  value: 'Asia/Dhaka' },
  { label: 'Doha — Qatar (AST)',                        value: 'Asia/Qatar' },
  { label: 'Dubai — UAE (GST)',                         value: 'Asia/Dubai' },
  { label: 'Dublin — Ireland (GMT/IST)',                value: 'Europe/Dublin' },
  { label: 'Eastern Time — US & Canada (ET)',           value: 'America/New_York' },
  { label: 'Helsinki — Finland (EET/EEST)',             value: 'Europe/Helsinki' },
  { label: 'Ho Chi Minh City — Vietnam (ICT)',          value: 'Asia/Ho_Chi_Minh' },
  { label: 'Hong Kong (HKT)',                           value: 'Asia/Hong_Kong' },
  { label: 'Istanbul — Turkey (TRT)',                   value: 'Europe/Istanbul' },
  { label: 'Jakarta — Indonesia (WIB)',                 value: 'Asia/Jakarta' },
  { label: 'Johannesburg — South Africa (SAST)',        value: 'Africa/Johannesburg' },
  { label: 'Karachi — Pakistan (PKT)',                  value: 'Asia/Karachi' },
  { label: 'Kathmandu — Nepal (NPT)',                   value: 'Asia/Kathmandu' },
  { label: 'Kolkata — India (IST)',                     value: 'Asia/Kolkata' },
  { label: 'Kuwait City (AST)',                         value: 'Asia/Kuwait' },
  { label: 'Kyiv — Ukraine (EET/EEST)',                 value: 'Europe/Kyiv' },
  { label: 'Lagos — Nigeria (WAT)',                     value: 'Africa/Lagos' },
  { label: 'Lisbon — Portugal (WET)',                   value: 'Europe/Lisbon' },
  { label: 'London — UK (GMT/BST)',                     value: 'Europe/London' },
  { label: 'Madrid — Spain (CET/CEST)',                 value: 'Europe/Madrid' },
  { label: 'Manila — Philippines (PST)',                value: 'Asia/Manila' },
  { label: 'Mexico City (CST)',                         value: 'America/Mexico_City' },
  { label: 'Moscow — Russia (MSK)',                     value: 'Europe/Moscow' },
  { label: 'Mountain Time — US & Canada (MT)',          value: 'America/Denver' },
  { label: 'Nairobi — Kenya (EAT)',                     value: 'Africa/Nairobi' },
  { label: 'Newfoundland Time — Canada (NT)',           value: 'America/St_Johns' },
  { label: 'Pacific Time — US & Canada (PT)',           value: 'America/Los_Angeles' },
  { label: 'Paris / Berlin / Rome (CET/CEST)',          value: 'Europe/Paris' },
  { label: 'Perth — Western Australia (AWST)',          value: 'Australia/Perth' },
  { label: 'Riyadh — Saudi Arabia (AST)',               value: 'Asia/Riyadh' },
  { label: 'São Paulo — Brazil (BRT)',                  value: 'America/Sao_Paulo' },
  { label: 'Seoul — South Korea (KST)',                 value: 'Asia/Seoul' },
  { label: 'Shanghai / Beijing — China (CST)',          value: 'Asia/Shanghai' },
  { label: 'Singapore / Kuala Lumpur (SGT)',            value: 'Asia/Singapore' },
  { label: 'Stockholm — Sweden (CET/CEST)',             value: 'Europe/Stockholm' },
  { label: 'Sydney / Melbourne (AEST/AEDT)',            value: 'Australia/Sydney' },
  { label: 'Taipei — Taiwan (CST)',                     value: 'Asia/Taipei' },
  { label: 'Tehran — Iran (IRST)',                      value: 'Asia/Tehran' },
  { label: 'Tokyo — Japan (JST)',                       value: 'Asia/Tokyo' },
  { label: 'Toronto — Canada (ET)',                     value: 'America/Toronto' },
  { label: 'UTC / Greenwich Mean Time (GMT)',           value: 'UTC' },
  { label: 'Vancouver — Canada (PT)',                   value: 'America/Vancouver' },
  { label: 'Warsaw — Poland (CET/CEST)',                value: 'Europe/Warsaw' },
]

// Normalize deprecated/alternate IANA names to the canonical values above.
const TZ_ALIASES: Record<string, string> = {
  'Asia/Calcutta':                    'Asia/Kolkata',
  'Asia/Saigon':                      'Asia/Ho_Chi_Minh',
  'America/Buenos_Aires':             'America/Argentina/Buenos_Aires',
  'Europe/Kiev':                      'Europe/Kyiv',
  'America/Indiana/Indianapolis':     'America/New_York',
}

function detectBrowserTimezone(): string {
  try {
    const raw = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_ALIASES[raw] ?? raw
  } catch {
    return 'UTC'
  }
}

export function StepTimezone({ onNext, onBack }: StepTimezoneProps) {
  const [timezone, setTimezone] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const detected = detectBrowserTimezone()
    const match = TIMEZONES.find((tz) => tz.value === detected)
    setTimezone(match ? detected : 'UTC')
  }, [])

  // Focus search when dropdown opens; scroll selected into view
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchRef.current?.focus()
        const selected = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null
        selected?.scrollIntoView({ block: 'center' })
      }, 30)
    } else {
      setSearch('')
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('touchstart', handleOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  const filtered = search.trim()
    ? TIMEZONES.filter((tz) => tz.label.toLowerCase().includes(search.toLowerCase()))
    : TIMEZONES

  const selectedLabel = TIMEZONES.find((tz) => tz.value === timezone)?.label

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!timezone) { setError('Please select your timezone'); return }
    setSaving(true)
    setError('')
    const result = await saveTimezoneStep(timezone)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    onNext()
  }

  const localTime = timezone
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
      }).format(new Date())
    : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>Timezone</Label>

        {/* Inline dropdown — no portal/absolute so a focus trap never blocks it */}
        <div ref={containerRef}>
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-full items-center gap-2 border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <Globe size={16} className="shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-left">
              {selectedLabel ?? <span className="text-muted-foreground">Select your timezone…</span>}
            </span>
            <CaretUpDown size={14} className="shrink-0 text-muted-foreground" />
          </button>

          {/* Dropdown panel — inline, expands in flow; parent scroll area handles overflow */}
          {open && (
            <div className="mt-1 border border-border bg-background ring-1 ring-foreground/10">
              {/* Search */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <MagnifyingGlass size={14} className="shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search timezone…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Scrollable list */}
              <div
                ref={listRef}
                className="max-h-52 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No timezone found.
                  </p>
                ) : (
                  filtered.map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      data-selected={timezone === tz.value}
                      onClick={() => { setTimezone(tz.value); setOpen(false) }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                    >
                      <span>{tz.label}</span>
                      {timezone === tz.value && (
                        <Check size={13} weight="bold" className="shrink-0 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!open && localTime && (
        <div className="flex items-center gap-2 border border-border bg-muted/40 px-4 py-3">
          <Globe size={16} className="shrink-0 text-primary" />
          <span className="text-sm">
            Your current local time: <strong>{localTime}</strong>
          </span>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button type="submit" className="w-full" disabled={saving || !timezone}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  )
}
