'use client'

import {
  AddressBook,
  CalendarCheck,
  CalendarPlus,
  MagnifyingGlass,
  Spinner,
  UsersThree,
} from '@phosphor-icons/react'
import { formatInTimeZone } from 'date-fns-tz'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MIN_QUERY = 2

interface SearchResults {
  bookings: { id: string; inviteeName: string; inviteeEmail: string; startTime: string }[]
  contacts: { id: string; name: string; email: string }[]
  eventTypes: { id: string; name: string; slug: string }[]
  users: { id: string; name: string; email: string; role: string }[]
}

const EMPTY_RESULTS: SearchResults = { bookings: [], contacts: [], eventTypes: [], users: [] }

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < MIN_QUERY) {
      setResults(EMPTY_RESULTS)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = res.ok ? await res.json() : EMPTY_RESULTS
        setResults({ ...EMPTY_RESULTS, ...data })
      } catch {
        // aborted or network error — leave last-known results in place
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => () => abortRef.current?.abort(), [])

  const hasQuery = query.trim().length >= MIN_QUERY
  const totalCount =
    results.bookings.length + results.contacts.length + results.eventTypes.length + results.users.length

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Enter jumps to the first available result across all categories.
    const first =
      (results.eventTypes[0] && `/event-types/${results.eventTypes[0].id}`) ??
      (results.bookings[0] && `/bookings/${results.bookings[0].id}`) ??
      (results.contacts[0] && `/contacts?q=${encodeURIComponent(results.contacts[0].email)}`) ??
      (results.users[0] && `/settings/users/${results.users[0].id}`)
    if (first) go(first)
  }

  return (
    <Popover open={open && hasQuery} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative hidden sm:block">
          {loading ? (
            <Spinner
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
            />
          ) : (
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          )}
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-9 w-48 md:w-72 lg:w-[340px] rounded-none border border-base-300 bg-page pl-8 pr-3 text-sm text-base-content placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            placeholder="Search bookings, contacts, meeting types…"
            type="search"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[340px] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {results.eventTypes.length > 0 && (
          <ResultGroup label="Meeting Types">
            {results.eventTypes.map((et) => (
              <ResultRow
                key={et.id}
                icon={<CalendarPlus size={14} />}
                label={et.name}
                sub={`/${et.slug}`}
                onClick={() => go(`/event-types/${et.id}`)}
              />
            ))}
          </ResultGroup>
        )}

        {results.bookings.length > 0 && (
          <ResultGroup label="Bookings">
            {results.bookings.map((b) => (
              <ResultRow
                key={b.id}
                icon={<CalendarCheck size={14} />}
                label={b.inviteeName}
                sub={formatInTimeZone(new Date(b.startTime), 'UTC', 'MMM d, yyyy')}
                onClick={() => go(`/bookings/${b.id}`)}
              />
            ))}
          </ResultGroup>
        )}

        {results.contacts.length > 0 && (
          <ResultGroup label="Contacts">
            {results.contacts.map((c) => (
              <ResultRow
                key={c.id}
                icon={<AddressBook size={14} />}
                label={c.name}
                sub={c.email}
                onClick={() => go(`/contacts?q=${encodeURIComponent(c.email)}`)}
              />
            ))}
          </ResultGroup>
        )}

        {results.users.length > 0 && (
          <ResultGroup label="Users">
            {results.users.map((u) => (
              <ResultRow
                key={u.id}
                icon={<UsersThree size={14} />}
                label={u.name}
                sub={u.email}
                onClick={() => go(`/settings/users/${u.id}`)}
              />
            ))}
          </ResultGroup>
        )}

        {!loading && totalCount === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results for “{query.trim()}”
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 pb-1 pt-1.5 text-2xs font-bold uppercase tracking-ui text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon, label, sub, onClick,
}: {
  icon: React.ReactNode; label: string; sub?: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-base-200',
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-base-content">{label}</span>
      {sub && <span className="shrink-0 text-xs text-muted-foreground">{sub}</span>}
    </button>
  )
}
