'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { type CommPrefs, updateCommunicationPrefs } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const JOIN_SOON_OPTIONS = [
  { value: 0,  label: 'Off' },
  { value: 5,  label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
]

interface CommunicationFormProps {
  initial: CommPrefs
}

const HOST_NOTIFICATIONS = [
  { key: 'bookingNotificationEmail' as const, label: 'New booking',         desc: 'Get an email when someone books a meeting with you.' },
  { key: 'cancellationEmail'         as const, label: 'Booking cancelled',   desc: 'Get notified when an invitee cancels.' },
  { key: 'rescheduleEmail'           as const, label: 'Booking rescheduled', desc: 'Get notified when an invitee reschedules.' },
]

const INVITEE_NOTIFICATIONS = [
  { key: 'bookingConfirmationEmail' as const, label: 'Confirmation email', desc: 'Send invitees a confirmation email after they book.' },
  { key: 'reminderEmail24h'         as const, label: '24-hour reminder',   desc: 'Send invitees a reminder the day before the meeting.' },
  { key: 'reminderEmail1h'          as const, label: '1-hour reminder',    desc: 'Send invitees a reminder one hour before the meeting.' },
]

export function CommunicationForm({ initial }: CommunicationFormProps) {
  const [prefs, setPrefs]   = useState<CommPrefs>(initial)
  const [saving, setSaving] = useState(false)

  function toggle(key: keyof CommPrefs) {
    if (typeof prefs[key] !== 'boolean') return
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await updateCommunicationPrefs(prefs)
    setSaving(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Preferences saved')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Host notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>Emails sent to you when scheduling events occur.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-base-300">
          {HOST_NOTIFICATIONS.map((item, i) => (
            <div key={item.key} className={`flex items-center justify-between gap-4 ${i === 0 ? 'pb-4' : 'py-4'}`}>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={prefs[item.key] as boolean}
                onCheckedChange={() => toggle(item.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invitee notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Invitee Notifications</CardTitle>
          <CardDescription>Emails sent to the people who book with you.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-base-300">
          {INVITEE_NOTIFICATIONS.map((item, i) => (
            <div key={item.key} className={`flex items-center justify-between gap-4 ${i === 0 ? 'pb-4' : 'py-4'}`}>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={prefs[item.key] as boolean}
                onCheckedChange={() => toggle(item.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* In-app "Join soon" bar */}
      <Card>
        <CardHeader>
          <CardTitle>In-App Reminders</CardTitle>
          <CardDescription>The &ldquo;Join soon&rdquo; bar that slides in before a meeting starts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Show &ldquo;Join soon&rdquo; bar</p>
              <p className="text-sm text-muted-foreground">
                Appears at the top of the app with a live countdown and a Join button before your meeting.
              </p>
            </div>
            <Select
              value={String(prefs.joinSoonLeadMinutes)}
              onValueChange={(v) => setPrefs((p) => ({ ...p, joinSoonLeadMinutes: Number(v) }))}
            >
              <SelectTrigger className="w-44 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOIN_SOON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email sender customisation */}
      <Card>
        <CardHeader>
          <CardTitle>Email Customisation</CardTitle>
          <CardDescription>Override the sender name and reply-to address on outgoing emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="from-name">From name</Label>
              <Input
                id="from-name"
                placeholder="Your name or company"
                value={prefs.fromName}
                onChange={(e) => setPrefs((p) => ({ ...p, fromName: e.target.value }))}
                maxLength={64}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-to">Reply-to email</Label>
              <Input
                id="reply-to"
                type="email"
                placeholder="reply@example.com"
                value={prefs.replyToEmail}
                onChange={(e) => setPrefs((p) => ({ ...p, replyToEmail: e.target.value }))}
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
