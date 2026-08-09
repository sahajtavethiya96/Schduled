'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import {
  ArrowLeft,
  CheckCircle,
  CalendarBlank,
  CalendarPlus,
  Clock,
  MapPin,
  VideoCamera,
  Phone,
  Globe,
  ArrowsClockwise,
  X,
  UserCircle,
  Timer,
  EnvelopeSimple,
  Bell,
  Link as LinkIcon,
  Copy,
  Check,
  CaretDown,
  House,
  PencilSimple,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/logo'
import { PRODUCT_NAME } from '@/config/platform'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCountdown(startMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, startMs - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { diff, days, hours, minutes, started: diff === 0 }
}

function locationInfo(type: string): { icon: React.ReactNode; label: string; color: string } {
  switch (type) {
    case 'google_meet':
      return { icon: <VideoCamera size={14} weight="fill" />, label: 'Google Meet', color: 'text-primary' }
    case 'zoom':
      return { icon: <VideoCamera size={14} weight="fill" />, label: 'Zoom', color: 'text-primary' }
    case 'phone_host_calls':
      return { icon: <Phone size={14} weight="fill" />, label: 'Phone (host calls you)', color: 'text-primary' }
    case 'phone_invitee_calls':
      return { icon: <Phone size={14} weight="fill" />, label: 'Phone call', color: 'text-primary' }
    case 'in_person':
      return { icon: <MapPin size={14} weight="fill" />, label: 'In-person meeting', color: 'text-muted-foreground' }
    default:
      return { icon: <LinkIcon size={14} weight="fill" />, label: 'Online meeting', color: 'text-primary' }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  eventName: string
  hostName: string
  hostUsername: string | null
  eventSlug?: string | null
  eventTypeId?: string | null
  startUtc: string
  endUtc: string | null
  timezone: string
  locationType: string
  locationValue?: string | null
  cancelToken: string | null
  rescheduleToken: string | null
  isPending?: boolean
  isOwner?: boolean
  showPoweredBy?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfirmationClient({
  eventName,
  hostName,
  hostUsername,
  eventSlug,
  eventTypeId,
  startUtc,
  endUtc,
  timezone,
  locationType,
  locationValue,
  cancelToken,
  rescheduleToken,
  isPending = false,
  isOwner = false,
  showPoweredBy = true,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [copyLinkDone, setCopyLinkDone] = useState(false)
  useEffect(() => setMounted(true), [])

  function copyPageLink() {
    const bookingUrl = hostUsername && eventSlug
      ? `${window.location.origin}/${hostUsername}/${eventSlug}`
      : window.location.href
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopyLinkDone(true)
      setTimeout(() => setCopyLinkDone(false), 2000)
    })
  }

  const startMs = Number.isNaN(Date.parse(startUtc)) ? Date.now() : Date.parse(startUtc)
  const countdown = useCountdown(startMs)

  const startDate = new Date(startMs)
  const endDate = endUtc ? new Date(endUtc) : null

  const dateLine = formatInTimeZone(startDate, timezone, 'EEEE, MMMM d, yyyy')
  const startTime = formatInTimeZone(startDate, timezone, 'h:mm a')
  const endTime = endDate ? formatInTimeZone(endDate, timezone, 'h:mm a') : null
  const tzLabel = formatInTimeZone(startDate, timezone, 'zzz')

  const loc = locationInfo(locationType)

  const countdownLabel = (() => {
    if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h`
    if (countdown.hours > 0) return `${countdown.hours}h ${countdown.minutes}m`
    if (countdown.minutes > 0) return `${countdown.minutes}m`
    return 'Starting soon'
  })()

  return (
    <div className="relative min-h-screen bg-base-200/30 p-4 md:flex md:items-center md:justify-center md:p-8">

      {/* Blur decorations */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[10%] top-[8%] h-72 w-72 bg-primary/[0.08] blur-[80px]" />
        <div className="absolute left-[5%] bottom-[10%] h-56 w-56 bg-primary/[0.06] blur-[70px]" />
      </div>

      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[56px] border-b border-base-300 bg-base-100/96 backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-[580px] items-center justify-between px-0">
        <Logo size="md" href="/" />
        <div className="flex items-center gap-2">
          {/* Copy link — primary filled */}
          <button
            type="button"
            onClick={copyPageLink}
            className="inline-flex h-8 items-center gap-1.5 bg-primary px-3.5 text-xs font-semibold text-primary-content transition-opacity hover:opacity-90"
          >
            {copyLinkDone
              ? <Check size={13} weight="bold" />
              : <Copy size={13} />
            }
            <span>{copyLinkDone ? 'Copied!' : 'Copy link'}</span>
          </button>
          {/* Menu — outlined; non-modal so it doesn't scroll-lock the body and
              jerk the page when scrollbar-gutter compensation double-applies */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-base-300 px-3.5 text-xs font-semibold text-base-content/70 transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
              >
                Menu
                <CaretDown size={11} weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem asChild>
                <Link
                  href={isOwner ? '/dashboard' : (hostUsername ? `/${hostUsername}` : '/')}
                  className="flex items-center gap-2"
                >
                  <House size={14} />
                  Home
                </Link>
              </DropdownMenuItem>
              {isOwner && eventTypeId && (
                <DropdownMenuItem asChild>
                  <Link href={`/event-types/${eventTypeId}`} className="flex items-center gap-2">
                    <PencilSimple size={14} />
                    Edit event type
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[580px]" style={{ paddingTop: '3.5rem' }}>
        <div className="flex flex-col items-center gap-5 bg-base-100 px-5 py-8 sm:px-8 border-[3px] border-primary">

          {/* Back button */}
          <div className="w-full">
            <Link
              href={hostUsername ? `/${hostUsername}` : '/'}
              className="inline-flex items-center gap-2 border border-base-300 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>

          {/* ── Icon ── */}
          <div
            className={cn(
              'relative transition-all duration-700 ease-out',
              mounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
          >
            {isPending ? (
              <>
                <div className="absolute inset-0 scale-[2.2] bg-amber-400/20 blur-2xl" />
                <Bell
                  size={64}
                  weight="fill"
                  className="relative text-amber-500"
                />
              </>
            ) : (
              <>
                <div className="absolute inset-0 scale-[2.2] bg-primary/[0.09] blur-2xl" />
                <CheckCircle
                  size={64}
                  weight="fill"
                  className="relative text-primary"
                />
              </>
            )}
          </div>

          {/* ── Message ── */}
          <div className="text-center">
            {isPending ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-base-content">
                  Request Submitted!
                </h1>
                {hostName && (
                  <p className="mt-1 text-sm font-medium text-base-content">
                    Your request for{' '}
                    <span className="text-amber-600">{eventName}</span> with{' '}
                    <span className="text-primary">{hostName}</span> is awaiting approval.
                  </p>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  You&apos;ll receive a confirmation email once the host approves your request.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-base-content">
                  You&apos;re Scheduled!
                </h1>
                {hostName && (
                  <p className="mt-1 text-sm font-medium text-base-content">
                    Your meeting with <span className="text-primary">{hostName}</span> is confirmed.
                  </p>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  We&apos;ve sent a calendar invite and meeting details to your email.
                </p>
              </>
            )}
          </div>

          {/* ── Meeting details card ── */}
          <div className="w-full border border-base-300 bg-base-200/30">
            <div className="border-b border-base-300 px-5 py-2.5">
              <p className="text-sm font-bold text-base-content">{eventName}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 px-5 py-3.5">
              {hostName && (
                <div className="flex items-center gap-2">
                  <UserCircle size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs text-base-content">{hostName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarBlank size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-base-content">{dateLine}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-xs text-base-content">
                  {startTime}{endTime ? ` – ${endTime}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('shrink-0', loc.color)}>{loc.icon}</span>
                <span className={cn('text-xs font-medium', loc.color)}>{loc.label}</span>
              </div>
              {locationValue && (
                <div className="col-span-2 flex items-start gap-2">
                  {locationType === 'in_person' ? (
                    <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  ) : locationType === 'phone_invitee_calls' ? (
                    <Phone size={14} className="mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <LinkIcon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  {locationValue.startsWith('http') ? (
                    <a
                      href={locationValue}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      View Location
                    </a>
                  ) : (
                    <span className="break-all text-xs text-base-content">{locationValue}</span>
                  )}
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <Globe size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {timezone} · {tzLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ── Countdown ── */}
          {!isPending && !countdown.started && (
            <div className="flex w-full items-center justify-between bg-primary/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 text-primary">
                <Timer size={15} weight="fill" />
                <span className="text-sm font-semibold">Meeting starts in</span>
              </div>
              <span className="text-[17px] font-bold tracking-tight text-primary">
                {countdownLabel}
              </span>
            </div>
          )}

          {/* ── Reschedule / Cancel — hidden for pending bookings ── */}
          {!isPending && (rescheduleToken || cancelToken) && (
            <div className="flex w-full flex-col sm:flex-row gap-3">
              {rescheduleToken && (
                <Link
                  href={`/reschedule/${rescheduleToken}`}
                  className="flex flex-1 h-10 items-center justify-center gap-1.5 border border-primary text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-content"
                >
                  <ArrowsClockwise size={13} />
                  Reschedule
                </Link>
              )}
              {cancelToken && (
                <Link
                  href={`/cancel/${cancelToken}`}
                  className="flex flex-1 h-10 items-center justify-center gap-1.5 border border-error/30 text-sm font-semibold text-error/60 transition-all hover:bg-error/5 hover:border-error hover:text-error"
                >
                  <X size={13} />
                  Cancel Event
                </Link>
              )}
            </div>
          )}

          {/* ── What's Next ── */}
          <div className="w-full border border-base-300 px-5 py-3.5">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What&apos;s Next?
            </p>
            {isPending ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <Bell size={13} weight="fill" className="shrink-0 text-amber-500" />
                  <span className="text-xs text-muted-foreground">You&apos;ll receive an email once the host approves your request</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <EnvelopeSimple size={13} weight="fill" className="shrink-0 text-amber-500" />
                  <span className="text-xs text-muted-foreground">A calendar invite will be sent to you after approval</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <EnvelopeSimple size={13} weight="fill" className="shrink-0 text-primary/70" />
                  <span className="text-xs text-muted-foreground">Check your email for confirmation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Bell size={13} weight="fill" className="shrink-0 text-primary/70" />
                  <span className="text-xs text-muted-foreground">You&apos;ll receive reminder emails before the meeting</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Schedule another meeting ── */}
          {hostUsername && (
            <Link
              href={`/${hostUsername}`}
              className="flex w-full h-10 items-center justify-center gap-1.5 border border-base-300 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <CalendarPlus size={14} />
              Schedule another meeting
            </Link>
          )}

        </div>

        {/* ── Powered by ── */}
        {showPoweredBy && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <span>Scheduling powered by</span>
            <span className="font-semibold text-primary">{PRODUCT_NAME}</span>
          </div>
        )}
      </div>
    </div>
  )
}
