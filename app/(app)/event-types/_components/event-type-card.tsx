'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  ArrowSquareOut,
  CalendarCheck,
  Check,
  Clock,
  Copy,
  DotsSixVertical,
  DotsThreeVertical,
  Link as LinkIcon,
  MapPin,
  PencilSimple,
  Phone,
  Globe,
  GoogleLogo,
  Screencast,
  Trash,
  User,
  VideoCamera,
  Warning,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  deleteEventType,
  duplicateEventType,
  toggleEventTypeActive,
} from '@/app/actions/event-types'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useAppOrigin } from '@/hooks/use-app-origin'
import { cn } from '@/lib/utils'

interface Duration {
  duration: number
  isDefault: boolean
}

export interface EventTypeStats {
  countThisMonth: number
  lastBooked: Date | null
}

const MEETING_TYPE_LABEL: Record<string, string> = {
  one_on_one:  'One-on-One',
  group:       'Group',
  round_robin: 'Round Robin',
  collective:  'Collective',
}

interface EventTypeCardProps {
  id: string
  name: string
  slug: string
  color?: string | null
  locationType: string
  meetingType?: string
  isActive: boolean
  isHidden: boolean
  durations: Duration[]
  username: string | null
  stats?: EventTypeStats
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  googleMeetConnected?: boolean
  zoomConnected?: boolean
  viewMode?: 'list' | 'grid'
}

// ── Location meta ─────────────────────────────────────────────────────────────

const LOCATION_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  zoom:                { label: 'Zoom',             icon: <VideoCamera size={13} weight="fill" />, cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'    },
  google_meet:         { label: 'Google Meet',      icon: <GoogleLogo  size={13} weight="bold"  />, cls: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  phone_host_calls:    { label: 'Phone call',       icon: <Phone       size={13} weight="fill" />, cls: 'bg-primary/10 text-primary'                          },
  phone_invitee_calls: { label: 'Phone (invitee)',  icon: <Phone       size={13} weight="fill" />, cls: 'bg-primary/10 text-primary'                          },
  in_person:           { label: 'In-person',        icon: <MapPin      size={13} weight="fill" />, cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'},
  custom:              { label: 'Custom',           icon: <Globe       size={13} weight="fill" />, cls: 'bg-muted text-muted-foreground'                       },
  invitees_choice:     { label: "Invitee's choice", icon: <Screencast  size={13} weight="fill" />, cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'},
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function relativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function EventTypeCard({
  id, name, slug, color, locationType, meetingType = 'one_on_one',
  isActive, isHidden, durations, username, stats,
  isSelected = false, onSelect, dragHandleProps,
  googleMeetConnected = true, zoomConnected = true,
  viewMode = 'list',
}: EventTypeCardProps) {
  const router = useRouter()
  const appOrigin = useAppOrigin()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [lastBookedLabel, setLastBookedLabel] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loc = LOCATION_META[locationType] ?? LOCATION_META.custom

  useEffect(() => {
    if (stats?.lastBooked) setLastBookedLabel(relativeDate(stats.lastBooked))
  }, [stats?.lastBooked])

  const bookingUrl = username && appOrigin ? `${appOrigin}/${username}/${slug}` : null
  const cardColor = color || 'var(--primary)'
  const isActive_ = isSelected || isHovered

  const cardStyle: React.CSSProperties = isActive_
    ? {
        borderColor: cardColor,
        backgroundColor: `color-mix(in srgb, ${cardColor} ${isSelected ? 4 : 2}%, transparent)`,
      }
    : {}

  const sortedDurations = [...durations].sort((a, b) => a.duration - b.duration)
  const durationLabel = sortedDurations.map((d) => formatDuration(d.duration)).join(' / ')

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const res = await toggleEventTypeActive(id, checked)
      if ('error' in res) toast.error(res.error)
      else { toast.success(checked ? 'Meeting type activated' : 'Meeting type deactivated'); router.refresh() }
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const res = await duplicateEventType(id)
      if ('error' in res) toast.error(res.error)
      else { toast.success('Meeting type duplicated'); router.refresh() }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEventType(id)
      if ('error' in res) toast.error(res.error)
      else { toast.success('Meeting type deleted'); router.refresh() }
    })
  }

  function copyLink() {
    if (!bookingUrl || copied) return
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const notConnected =
    (locationType === 'google_meet' && !googleMeetConnected) ||
    (locationType === 'zoom' && !zoomConnected)

  // ── Shared dropdown items ──────────────────────────────────────────────────

  // Rendered as a sibling of DropdownMenu (not nested inside it) and opened
  // via local state set from the Delete DropdownMenuItem's onClick. This
  // follows the Headless UI maintainer's documented recommendation for a
  // Dialog triggered from a Menu item: move the Dialog outside the
  // Menu/MenuItem tree and drive its open state from there, rather than
  // nesting it inside the menu (github.com/tailwindlabs/headlessui,
  // discussion #1449) — nesting it would tie the dialog's mounted state to
  // the menu's own open/closed state, which Headless UI's MenuItem doesn't
  // support keeping independent of a menu-item click.
  const deleteConfirmDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this meeting type and all associated questions. Existing bookings will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const moreMenu = (align: 'start' | 'end' = 'end') => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" title="More" aria-label="More" disabled={isPending}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50">
            <DotsThreeVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/event-types/${id}`} className="flex items-center gap-2">
              <PencilSimple size={14} /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2" onClick={copyLink} disabled={!bookingUrl || !isActive}>
            <LinkIcon size={14} /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2" onClick={handleDuplicate}>
            <Copy size={14} /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center gap-2 text-destructive data-focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash size={14} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteConfirmDialog}
    </>
  )

  // ── Shared badges ─────────────────────────────────────────────────────────

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        <User size={11} weight="bold" />
        {MEETING_TYPE_LABEL[meetingType] ?? 'One-on-One'}
      </span>
      {durationLabel && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
          <Clock size={11} weight="bold" />
          {durationLabel}
        </span>
      )}
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium', loc.cls)}>
        {loc.icon}{loc.label}
      </span>
      {notConnected && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Warning size={11} weight="fill" /> Not connected
        </span>
      )}
    </div>
  )

  // ── Toggle + label ─────────────────────────────────────────────────────────

  const toggleControl = (
    <div className="flex items-center gap-1.5">
      <Switch checked={isActive} disabled={isPending} onCheckedChange={handleToggle} aria-label={isActive ? 'Deactivate' : 'Activate'} />
      <span className={cn('w-7 text-xs font-bold leading-none', isActive ? 'text-primary' : 'text-muted-foreground/50')}>
        {isActive ? 'ON' : 'OFF'}
      </span>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // GRID layout
  // ─────────────────────────────────────────────────────────────────────────

  if (viewMode === 'grid') {
    return (
      <div
        className={cn('group flex flex-col border bg-card transition-all duration-200', !isActive && 'opacity-60')}
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top color strip */}
        <div className="h-1 w-full transition-all duration-200 group-hover:h-1.5" style={{ backgroundColor: cardColor }} />

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">

          {/* Name row */}
          <div className="flex items-start gap-2">
            <div className="pt-0.5">
              <Checkbox checked={isSelected} onCheckedChange={(c) => onSelect?.(id, c === true)} aria-label={`Select ${name}`} />
            </div>
            <Link href={`/event-types/${id}`} className="group/edit flex-1 min-w-0">
              <span
                className="text-sm font-semibold leading-snug underline-offset-2 transition-colors duration-150 group-hover/edit:underline"
                style={isActive_ ? { color: cardColor } : undefined}
              >
                {name}
              </span>
            </Link>
            <div className="flex shrink-0 gap-1">
              {isHidden && <Badge variant="outline" className="rounded-none py-0 px-1.5 text-xs font-medium">Hidden</Badge>}
              {!isActive && <Badge variant="secondary" className="rounded-none py-0 px-1.5 text-xs font-medium">Inactive</Badge>}
            </div>
          </div>

          {/* Badges */}
          {badges}

          {/* Stats */}
          {stats && (
            <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarCheck size={12} weight="bold" />
              <span>{stats.countThisMonth} booking{stats.countThisMonth !== 1 ? 's' : ''} this month</span>
              {lastBookedLabel && <span className="text-muted-foreground/50">· {lastBookedLabel}</span>}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <div className="flex items-center gap-0.5">
            {isActive && (
              <button type="button" data-tour="booking-link" title={copied ? 'Copied!' : 'Copy link'} onClick={copyLink} disabled={!bookingUrl}
                className={cn('flex h-7 w-7 items-center justify-center transition-colors disabled:pointer-events-none',
                  copied ? 'text-emerald-600' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary')}>
                {copied ? <Check size={13} weight="bold" /> : <LinkIcon size={13} />}
              </button>
            )}
            <Link href={`/event-types/${id}`} title="Edit"
              className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
              <PencilSimple size={13} />
            </Link>
            {isActive && bookingUrl && (
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" title="Open booking page"
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                <ArrowSquareOut size={13} />
              </a>
            )}
            {/* Smaller trigger size for grid */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="More" aria-label="More" disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50">
                  <DotsThreeVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/event-types/${id}`} className="flex items-center gap-2"><PencilSimple size={14} /> Edit</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={copyLink} disabled={!bookingUrl || !isActive}>
                  <LinkIcon size={14} /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={handleDuplicate}>
                  <Copy size={14} /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-destructive data-focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash size={14} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {deleteConfirmDialog}
          </div>
          {toggleControl}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST layout (default)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn('group flex items-stretch border bg-card transition-all duration-200', !isActive_ && 'border-border', !isActive && 'opacity-60')}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left color strip */}
      <div className={cn('shrink-0 transition-all duration-200', isActive_ ? 'w-1.5' : 'w-1')} style={{ backgroundColor: cardColor }} />

      {/* Checkbox */}
      <div className="flex items-center pl-4 pr-2">
        <Checkbox checked={isSelected} onCheckedChange={(c) => onSelect?.(id, c === true)} aria-label={`Select ${name}`} />
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center gap-4 min-w-0 py-3.5 pr-4">

        {/* Info — clicking anywhere here opens the editor */}
        <Link href={`/event-types/${id}`} className="group/edit flex-1 min-w-0 space-y-1.5">

          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold underline-offset-2 transition-colors duration-150 group-hover/edit:underline" style={isActive_ ? { color: cardColor } : undefined}>
              {name}
            </span>
            {isHidden && <Badge variant="outline" className="rounded-none py-0 px-1.5 text-xs font-medium">Hidden</Badge>}
            {!isActive && <Badge variant="secondary" className="rounded-none py-0 px-1.5 text-xs font-medium">Inactive</Badge>}
          </div>

          {/* Badges */}
          {badges}

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarCheck size={12} weight="bold" />
                {stats.countThisMonth} booking{stats.countThisMonth !== 1 ? 's' : ''} this month
              </span>
              {lastBookedLabel && (
                <span className="inline-flex items-center gap-1 text-muted-foreground/70">
                  <Clock size={11} weight="bold" />
                  Last {lastBookedLabel}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1">

          {/* Drag grip — visual hint; whole card is the drag zone */}
          <span className="pointer-events-none mr-1 flex h-8 w-6 select-none items-center justify-center text-muted-foreground/40">
            <DotsSixVertical size={16} />
          </span>

          {/* Copy link */}
          {isActive && (
            <button type="button" data-tour="booking-link" title={copied ? 'Copied!' : 'Copy link'} onClick={copyLink} disabled={!bookingUrl}
              className={cn('hidden h-8 w-8 items-center justify-center transition-colors disabled:pointer-events-none sm:flex',
                copied ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary')}>
              {copied ? <Check size={15} weight="bold" /> : <LinkIcon size={15} />}
            </button>
          )}

          {/* View bookings */}
          <Link href="/bookings" title="View bookings" aria-label={`View bookings for ${name}`}
            className="hidden h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary sm:flex">
            <CalendarCheck size={15} />
          </Link>

          {/* Edit */}
          <Link href={`/event-types/${id}`} title="Edit" aria-label={`Edit ${name}`}
            className="hidden h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary sm:flex">
            <PencilSimple size={15} />
          </Link>

          {/* Open booking page */}
          {isActive && bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" title="Open booking page"
              className="hidden h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary sm:flex">
              <ArrowSquareOut size={15} />
            </a>
          )}

          {/* Toggle — sits just before the ⋮ menu */}
          <div className="ml-1">{toggleControl}</div>

          {/* More */}
          {moreMenu('end')}
        </div>
      </div>
    </div>
  )
}
