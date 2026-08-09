'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Spinner } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  id?: string
}

/**
 * Text input with map-based address suggestions (keyless, via /api/geocode).
 * Free-text is always allowed — suggestions are a convenience, so if the
 * geocoder returns nothing the field behaves like a normal input.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom')

  const containerRef = useRef<HTMLDivElement>(null)
  const inputWrapRef = useRef<HTMLDivElement>(null)
  // Approximate location used to bias suggestions toward nearby places (so a
  // local village ranks above a far-away big city). Populated only when the
  // user has ALREADY granted geolocation — we never prompt from here.
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null)

  // Dropdown height cap (max-h-64) + a little breathing room.
  const DROPDOWN_SPACE = 280

  // Flip the dropdown above the input when there isn't enough room below it
  // (e.g. the field sits near the bottom of the viewport / above the sticky nav).
  const updatePlacement = useCallback(() => {
    const rect = inputWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setPlacement(spaceBelow < DROPDOWN_SPACE && spaceAbove > spaceBelow ? 'top' : 'bottom')
  }, [])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const c = coordsRef.current
      const bias = c ? `&lat=${c.lat}&lon=${c.lon}` : ''
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}${bias}`, {
        signal: controller.signal,
      })
      if (!res.ok) { setSuggestions([]); return }
      const data = await res.json()
      const list: string[] = Array.isArray(data.suggestions)
        ? data.suggestions.map((s: { label: string }) => s.label)
        : []
      setSuggestions(list)
      if (list.length > 0) { updatePlacement(); setOpen(true) } else { setOpen(false) }
      setActiveIndex(-1)
    } catch {
      // aborted or network error — ignore
    } finally {
      setLoading(false)
    }
  }, [updatePlacement])

  function handleInput(next: string) {
    onChange(next)
    setActiveIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (next.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(next.trim()), 300)
  }

  function selectSuggestion(label: string) {
    onChange(label)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Best-effort location bias: only read coords if geolocation is ALREADY
  // granted, so we never trigger a permission prompt from a settings form.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled || status.state !== 'granted') return
        navigator.geolocation.getCurrentPosition(
          (pos) => { coordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude } },
          () => {},
          { maximumAge: 600_000, timeout: 3000 }
        )
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Cleanup timers/requests on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div ref={inputWrapRef} className="relative">
        <MapPin
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          autoComplete="off"
          className="pl-9"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) { updatePlacement(); setOpen(true) } }}
          onBlur={onBlur}
        />
        {loading && (
          <Spinner
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-50 max-h-64 w-full overflow-y-auto border border-base-300 bg-base-100 py-1 ring-1 ring-foreground/10',
            placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {suggestions.map((s, i) => (
            <li key={`${s}-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                // onMouseDown (not onClick) so it fires before the input blurs.
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors',
                  i === activeIndex ? 'bg-primary/10 text-base-content' : 'text-muted-foreground hover:bg-base-200'
                )}
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
