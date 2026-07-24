'use client'

import { Clock, Globe, GoogleLogo, MapPin, Phone, Screencast, VideoCamera } from '@phosphor-icons/react'
import type { UseFormReturn } from 'react-hook-form'
import type { BuilderFormValues } from './builder'
import { MEETING_TYPES } from './tab-general'
import { useAppOrigin } from '@/hooks/use-app-origin'
import { cn } from '@/lib/utils'

const LOCATION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  zoom:                { label: 'Zoom',             icon: <VideoCamera size={11} weight="fill" /> },
  google_meet:         { label: 'Google Meet',      icon: <GoogleLogo  size={11} weight="bold"  /> },
  phone_host_calls:    { label: 'Phone call',        icon: <Phone       size={11} weight="fill" /> },
  phone_invitee_calls: { label: 'Phone call',        icon: <Phone       size={11} weight="fill" /> },
  in_person:           { label: 'In-person',         icon: <MapPin      size={11} weight="fill" /> },
  custom:              { label: 'Custom',            icon: <Globe       size={11} weight="fill" /> },
  invitees_choice:     { label: "Invitee's choice",  icon: <Screencast  size={11} weight="fill" /> },
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

interface LivePreviewProps {
  form: UseFormReturn<BuilderFormValues>
  username: string | null
  meetingType: string
}

export function LivePreview({ form, username, meetingType }: LivePreviewProps) {
  const appOrigin = useAppOrigin()
  const name = form.watch('name') || 'Meeting Name'
  const description = form.watch('description')
  const color = form.watch('color') || '#0d9488'
  const slug = form.watch('slug') || 'your-meeting'
  const durations = form.watch('durations') ?? []
  const locationType = form.watch('locationType') || 'zoom'
  const isActive = form.watch('isActive')
  const isHidden = form.watch('isHidden')

  const initials = (name[0] ?? 'E').toUpperCase()
  const sortedDurations = [...durations].sort((a, b) => a - b)
  const loc = LOCATION_LABELS[locationType] ?? LOCATION_LABELS.custom
  const meetingLabel = MEETING_TYPES.find((m) => m.id === meetingType)?.label ?? 'One-on-One'

  const displayUrl = username && appOrigin
    ? `${appOrigin.replace(/^https?:\/\//, '')}/${username}/${slug}`
    : null

  return (
    <div className="sticky top-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</p>
        <span className={cn(
          'text-2xs font-bold px-2 py-0.5',
          isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Booking card mockup */}
      <div className="border border-border bg-card overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />

        <div className="p-5 space-y-4">
          {/* Avatar + name + badge */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 flex items-center justify-center font-bold text-sm text-white"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{name}</h3>
              <span className="text-2xs text-muted-foreground">{meetingLabel}</span>
            </div>
            {isHidden && (
              <span className="ml-auto shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground">
                Private
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {description}
            </p>
          )}

          {/* Duration pills */}
          {sortedDurations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedDurations.slice(0, 4).map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium"
                >
                  <Clock size={10} weight="bold" />
                  {formatDuration(d)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium">
                {loc.icon}
                {loc.label}
              </span>
            </div>
          )}

          {/* Booking URL */}
          {displayUrl && (
            <div className="text-2xs font-mono text-muted-foreground/70 truncate pt-1 border-t border-border/60">
              {displayUrl}
            </div>
          )}
        </div>

        {/* CTA button mockup */}
        <div className="px-5 pb-5">
          <div
            className="h-9 flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            Book a time
          </div>
        </div>
      </div>

      <p className="text-2xs text-muted-foreground text-center mt-2">
        Updates live as you edit
      </p>
    </div>
  )
}
