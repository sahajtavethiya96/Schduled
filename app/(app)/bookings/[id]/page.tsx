import { and, asc, eq } from 'drizzle-orm'
import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowCounterClockwise,
  ArrowLeft,
  CalendarBlank,
  CaretRight,
  ChatCircleText,
  Check,
  CheckCircle,
  Circle,
  ClockCounterClockwise,
  Clock,
  EnvelopeSimple,
  Globe,
  Hash,
  MapPin,
  NotePencil,
  Phone,
  UsersThree,
  VideoCamera,
  Warning,
  X,
} from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { PRODUCT_NAME } from '@/config/platform'
import { booking, bookingAnswer, bookingGuest, eventType, user } from '@/db/schema'
import { requireSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { STATUS_STYLES } from '@/lib/booking-status'
import { cn, normalizeTzName } from '@/lib/utils'
import { AddToCalendar, Countdown, MeetingLink, NoShowButton } from './_components/booking-detail-widgets'

export const metadata = { title: 'Booking details' }

const LOCATION_LABEL: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  phone_host_calls: 'Phone (you call the invitee)',
  phone_invitee_calls: 'Phone (invitee calls you)',
  in_person: 'In person',
  custom: 'Custom',
  invitees_choice: "Invitee's choice",
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireSession()

  const [b] = await db
    .select({
      id: booking.id,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteePhone: booking.inviteePhone,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      status: booking.status,
      locationValue: booking.locationValue,
      videoLinkError: booking.videoLinkError,
      cancelToken: booking.cancelToken,
      rescheduleToken: booking.rescheduleToken,
      approvalToken: booking.approvalToken,
      rescheduleRequestedStart: booking.rescheduleRequestedStart,
      cancellationReason: booking.cancellationReason,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      rejectionReason: booking.rejectionReason,
      rescheduleCount: booking.rescheduleCount,
      hostNotes: booking.hostNotes,
      createdAt: booking.createdAt,
      eventName: eventType.name,
      eventColor: eventType.color,
      locationType: eventType.locationType,
    })
    .from(booking)
    .innerJoin(eventType, eq(eventType.id, booking.eventTypeId))
    .where(and(eq(booking.id, id), eq(booking.hostUserId, session.user.id)))
    .limit(1)

  if (!b) notFound()

  const [hostRow] = await db.select({ timezone: user.timezone }).from(user).where(eq(user.id, session.user.id)).limit(1)
  const hostTz = hostRow?.timezone ?? 'UTC'

  const [answers, guests] = await Promise.all([
    db.select({ label: bookingAnswer.questionLabel, answer: bookingAnswer.answer })
      .from(bookingAnswer).where(eq(bookingAnswer.bookingId, b.id)).orderBy(asc(bookingAnswer.id)),
    db.select({ email: bookingGuest.guestEmail, name: bookingGuest.guestName })
      .from(bookingGuest).where(eq(bookingGuest.bookingId, b.id)),
  ])

  const now = new Date()
  const color = b.eventColor ?? 'var(--primary)'
  const statusMeta = STATUS_STYLES[b.status] ?? STATUS_STYLES.no_show
  const isUpcoming = b.status === 'confirmed' && b.startTime > now
  const isPending = b.status === 'pending'
  const isRescheduleReq = b.status === 'reschedule_requested'
  const isCancelled = b.status === 'cancelled'
  const locationLabel = LOCATION_LABEL[b.locationType ?? 'custom'] ?? 'Online'
  const joinUrl =
    b.locationValue?.startsWith('http') &&
    ['zoom', 'google_meet', 'teams', 'custom', 'in_person'].includes(b.locationType ?? '')
      ? b.locationValue
      : null
  const isLocationLink = b.locationType === 'in_person' && !!joinUrl
  const videoLinkFailedMessage = !joinUrl && b.videoLinkError
    ? b.videoLinkError === 'zoom_not_connected'
      ? 'Zoom isn’t connected — reconnect it in Settings to generate this link.'
      : 'The meeting link couldn’t be created. Reconnect Zoom in Settings, or contact the invitee directly.'
    : null
  const isPastConfirmed = b.status === 'confirmed' && b.startTime <= now
  const hasActions = isUpcoming || (isPending && b.approvalToken) || (isRescheduleReq && b.approvalToken) || isPastConfirmed

  // Which /bookings tab this booking lives under — mirrors the tab resolution
  // in app/(app)/bookings/page.tsx so the breadcrumb and back link return to
  // the tab that actually shows this booking, not always "Upcoming".
  const bookingsTab =
    isPending || isRescheduleReq ? 'pending'
    : isCancelled || b.status === 'rescheduled' ? 'cancelled'
    : b.startTime > now ? 'upcoming'
    : 'past'
  const BOOKINGS_TAB_LABEL: Record<typeof bookingsTab, string> = {
    upcoming: 'Upcoming', pending: 'Pending', past: 'Past', cancelled: 'Cancelled',
  }
  const bookingsHref = `/bookings?tab=${bookingsTab}`

  // ── Add-to-calendar links ──
  const gd = (d: Date) => formatInTimeZone(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'")
  const calTitle = `${b.eventName} with ${b.inviteeName}`
  const calDetails = joinUrl ? `Join: ${joinUrl}` : locationLabel
  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(calTitle)}` +
    `&dates=${gd(b.startTime)}/${gd(b.endTime)}` +
    `&details=${encodeURIComponent(calDetails)}` +
    `&location=${encodeURIComponent(joinUrl ?? locationLabel)}`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${PRODUCT_NAME}//EN`, 'BEGIN:VEVENT',
    `UID:${b.id}@schduled`, `DTSTART:${gd(b.startTime)}`, `DTEND:${gd(b.endTime)}`,
    `SUMMARY:${icsEscape(calTitle)}`, `DESCRIPTION:${icsEscape(calDetails)}`,
    `LOCATION:${icsEscape(joinUrl ?? locationLabel)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`

  // ── Activity timeline (derived from available data) ──
  const timeline: { label: string; time: string | null; done: boolean }[] = [
    { label: 'Booking created', time: formatInTimeZone(b.createdAt, hostTz, "MMM d · h:mm a"), done: true },
  ]
  if (b.status === 'confirmed' || b.status === 'completed') {
    timeline.push({ label: 'Confirmation sent', time: null, done: true })
  }
  if (joinUrl) timeline.push({ label: 'Meeting link ready', time: null, done: true })
  if (isCancelled) {
    timeline.push({ label: 'Booking cancelled', time: b.cancelledAt ? formatInTimeZone(b.cancelledAt, hostTz, 'MMM d · h:mm a') : null, done: true })
  } else {
    timeline.push({ label: 'Meeting starts', time: formatInTimeZone(b.startTime, hostTz, 'MMM d · h:mm a'), done: b.startTime <= now })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-xs font-medium">
          <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-primary">Dashboard</Link>
          <CaretRight size={10} className="text-muted-foreground/40" />
          <Link href={bookingsHref} className="text-muted-foreground transition-colors hover:text-primary">{BOOKINGS_TAB_LABEL[bookingsTab]}</Link>
          <CaretRight size={10} className="text-muted-foreground/40" />
          <span className="font-semibold text-foreground">Booking details</span>
        </nav>
        <Link
          href={bookingsHref}
          className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
        >
          <ArrowLeft size={15} /> Back to bookings
        </Link>
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-border border-l-[5px] bg-background p-6" style={{ borderLeftColor: color }}>
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-black text-white" style={{ backgroundColor: color }}>
            {b.inviteeName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-black text-[26px] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                {b.inviteeName}
              </h1>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold', statusMeta.badge)}>
                <span className={cn('size-1.5 rounded-full', statusMeta.dotClass)} />
                {statusMeta.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{b.eventName} · {b.duration} min</p>
          </div>
        </div>
        {isUpcoming && <Countdown startUtc={b.startTime.toISOString()} />}
      </div>

      {/* ── Info cards ── (gap-6 matches the body grid below so the Location
           card lines up with the Quick Actions column) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <InfoCard icon={<CalendarBlank size={18} />} label="Date">
          <p className="font-semibold text-foreground">{formatInTimeZone(b.startTime, hostTz, 'EEEE')}</p>
          <p className="text-sm text-muted-foreground">{formatInTimeZone(b.startTime, hostTz, 'MMMM d, yyyy')}</p>
        </InfoCard>
        <InfoCard icon={<Clock size={18} />} label="Time">
          <p className="font-semibold text-foreground">{formatInTimeZone(b.startTime, hostTz, 'h:mm a')} – {formatInTimeZone(b.endTime, hostTz, 'h:mm a')}</p>
          <p className="text-sm text-muted-foreground">{b.duration} minutes · {normalizeTzName(hostTz)}</p>
        </InfoCard>
        <InfoCard icon={<VideoCamera size={18} />} label="Location">
          <p className="font-semibold text-foreground">{locationLabel}</p>
          {joinUrl && (
            <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
              {isLocationLink ? 'View location →' : 'Join meeting →'}
            </a>
          )}
          {videoLinkFailedMessage && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
              {videoLinkFailedMessage}
            </p>
          )}
        </InfoCard>
      </div>

      {/* ── Two-column body ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {joinUrl && (
            <Card title="Meeting link" icon={<VideoCamera size={14} />}>
              <MeetingLink url={joinUrl} />
            </Card>
          )}

          {/* Invitee profile */}
          <Card title="Invitee" icon={<EnvelopeSimple size={14} />}>
            <div className="flex items-center gap-3 pb-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {b.inviteeName.charAt(0).toUpperCase()}
              </span>
              <p className="font-semibold text-foreground">{b.inviteeName}</p>
            </div>
            <div className="space-y-2.5 border-t border-border/60 pt-3">
              <ProfileRow icon={<EnvelopeSimple size={14} />} label="Email">
                <a href={`mailto:${b.inviteeEmail}`} className="text-primary hover:underline">{b.inviteeEmail}</a>
              </ProfileRow>
              {b.inviteePhone && (
                <ProfileRow icon={<Phone size={14} />} label="Phone">{b.inviteePhone}</ProfileRow>
              )}
              <ProfileRow icon={<Globe size={14} />} label="Timezone">{normalizeTzName(b.inviteeTimezone ?? '')}</ProfileRow>
            </div>
          </Card>

          {answers.length > 0 && (
            <Card title="Responses" icon={<ChatCircleText size={14} />}>
              {answers.map((a, i) => (
                <div key={i} className="border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0">
                  <p className="text-xs font-medium uppercase tracking-ui text-muted-foreground">{a.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{a.answer}</p>
                </div>
              ))}
            </Card>
          )}

          {guests.length > 0 && (
            <Card title={`Guests (${guests.length})`} icon={<UsersThree size={14} />}>
              {guests.map((g, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {(g.name || g.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="text-foreground">{g.name || g.email}</span>
                  {g.name && <span className="text-muted-foreground">· {g.email}</span>}
                </div>
              ))}
            </Card>
          )}

          {isCancelled && (b.cancellationReason || b.cancelledAt) && (
            <Card title="Cancellation" icon={<X size={14} />}>
              {b.cancelledBy && <ProfileRow label="Cancelled by">{b.cancelledBy}</ProfileRow>}
              {b.cancelledAt && <ProfileRow label="Cancelled at">{formatInTimeZone(b.cancelledAt, hostTz, 'MMM d, yyyy · h:mm a')}</ProfileRow>}
              {b.cancellationReason && <ProfileRow label="Reason">{b.cancellationReason}</ProfileRow>}
            </Card>
          )}
          {b.rejectionReason && (
            <Card title="Decline reason" icon={<X size={14} />}>
              <p className="text-sm text-foreground">{b.rejectionReason}</p>
            </Card>
          )}

          {/* Notes */}
          <Card title="Notes" icon={<NotePencil size={14} />}>
            {b.hostNotes ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{b.hostNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes available.</p>
            )}
          </Card>

          {/* Booking details */}
          <Card title="Booking details" icon={<Hash size={14} />}>
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="space-y-2.5 pb-3 sm:pb-0 sm:pr-6">
                <ProfileRow label="Booking ID"><span className="font-mono text-xs">{b.id}</span></ProfileRow>
                <ProfileRow label="Duration">{b.duration} minutes</ProfileRow>
                <ProfileRow label="Created on">{formatInTimeZone(b.createdAt, hostTz, 'MMM d, yyyy · h:mm a')}</ProfileRow>
              </div>
              <div className="space-y-2.5 pt-3 sm:pl-6 sm:pt-0">
                <ProfileRow label="Meeting type">{b.eventName}</ProfileRow>
                <ProfileRow label="Source">Booking page</ProfileRow>
                <ProfileRow label="Rescheduled">
                  {b.rescheduleCount === 0 ? 'Never' : `${b.rescheduleCount} time${b.rescheduleCount === 1 ? '' : 's'}`}
                </ProfileRow>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {hasActions && (
            <Card title="Quick actions" icon={<VideoCamera size={14} />}>
              <div className="flex flex-col gap-2">
                {isUpcoming && joinUrl && (
                  <Button asChild className="w-full justify-center gap-1.5">
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer"><VideoCamera size={15} weight="fill" /> Join meeting</a>
                  </Button>
                )}
                {isUpcoming && (
                  <Button asChild variant="outline" className="w-full justify-center gap-1.5">
                    <Link href={`/reschedule/${b.rescheduleToken}`}><ArrowCounterClockwise size={15} /> Reschedule</Link>
                  </Button>
                )}
                {isUpcoming && (
                  <Button asChild variant="outline" className="w-full justify-center gap-1.5 text-destructive hover:border-destructive hover:text-destructive">
                    <Link href={`/cancel/${b.cancelToken}`}><X size={15} /> Cancel booking</Link>
                  </Button>
                )}
                {isPending && b.approvalToken && (
                  <>
                    <Button asChild className="w-full justify-center gap-1.5">
                      <Link href={`/booking/review/${b.approvalToken}?action=approve`}><Check size={15} weight="bold" /> Approve</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-center gap-1.5 text-destructive hover:border-destructive hover:text-destructive">
                      <Link href={`/booking/review/${b.approvalToken}`}><X size={15} weight="bold" /> Decline</Link>
                    </Button>
                  </>
                )}
                {isRescheduleReq && b.approvalToken && (
                  <>
                    {b.rescheduleRequestedStart && (
                      <p className="text-xs text-muted-foreground">
                        {b.inviteeName} requested to move this meeting to{' '}
                        <span className="font-semibold text-foreground">
                          {formatInTimeZone(b.rescheduleRequestedStart, hostTz, "EEE, MMM d 'at' h:mm a")}
                        </span>
                        . The current time stays booked until you approve.
                      </p>
                    )}
                    <Button asChild className="w-full justify-center gap-1.5">
                      <Link href={`/booking/review/${b.approvalToken}?type=reschedule&action=approve`}><Check size={15} weight="bold" /> Approve reschedule</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-center gap-1.5 text-destructive hover:border-destructive hover:text-destructive">
                      <Link href={`/booking/review/${b.approvalToken}?type=reschedule`}><X size={15} weight="bold" /> Decline reschedule</Link>
                    </Button>
                  </>
                )}
                {isPastConfirmed && <NoShowButton bookingId={b.id} />}
              </div>
            </Card>
          )}

          {/* Activity timeline */}
          <Card title="Activity" icon={<ClockCounterClockwise size={14} />}>
            <ol className="space-y-0">
              {timeline.map((t, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* `left-2` (half of the icon's fixed w-4/16px column) plus
                      `-translate-x-1/2` (half of the line's own 1px width)
                      centers the line under the icon by exact arithmetic
                      instead of a hardcoded left-[Npx] guess that drifts if
                      the icon size ever changes. Positioned relative to the
                      `<li>` (not a nested wrapper) so `h-full` correctly
                      extends through the li's own `pb-4` padding — that
                      padding is where the line needs to reach to visually
                      connect to the next row, and a flex-stretched inner
                      wrapper's content box doesn't include it. */}
                  {i < timeline.length - 1 && (
                    <span className="absolute left-2 top-5 h-full w-px -translate-x-1/2 bg-border" aria-hidden />
                  )}
                  <span className="relative z-10 mt-0.5 flex w-4 shrink-0 justify-center">
                    {t.done
                      ? <CheckCircle size={16} weight="fill" className="text-primary" />
                      : <Circle size={16} className="text-muted-foreground/40" />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', t.done ? 'text-foreground' : 'text-muted-foreground')}>{t.label}</p>
                    {t.time && <p className="text-xs text-muted-foreground">{t.time}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Calendar integration */}
          {!isCancelled && (
            <Card title="Add to calendar" icon={<CalendarBlank size={14} />}>
              <AddToCalendar googleUrl={googleUrl} icsHref={icsHref} filename={`${b.eventName.replace(/[^a-z0-9]+/gi, '-')}.ics`} />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-2.5">
        {icon && (
          <span className="flex size-5 items-center justify-center bg-primary/10 text-primary">{icon}</span>
        )}
        <h2 className="text-xs font-bold uppercase tracking-ui text-foreground/70">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border border-border bg-background p-4 transition-colors hover:border-primary/40">
      <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-ui text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function ProfileRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-1.5 shrink-0 text-xs font-medium uppercase tracking-ui text-muted-foreground">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">{children}</span>
    </div>
  )
}
