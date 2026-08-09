'use client'

import { useState } from 'react'
import { GoogleLogo, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { skipCalendarStep } from '@/app/actions/onboarding'

interface StepCalendarProps {
  onNext: () => void
  onBack: () => void
}

export function StepCalendar({ onNext, onBack }: StepCalendarProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSkip() {
    setLoading(true)
    setError('')
    const result = await skipCalendarStep()
    setLoading(false)
    if ('error' in result) { setError(result.error); return }
    onNext()
  }

  async function handleConnect() {
    // Save progress first so that when OAuth redirects back to /onboarding,
    // onboardingStep = 4 in the DB and the wizard resumes at step 5.
    setLoading(true)
    setError('')
    const result = await skipCalendarStep()
    if ('error' in result) { setError(result.error); setLoading(false); return }
    window.location.href = '/api/integrations/google?returnTo=/onboarding'
  }

  return (
    <div className="space-y-6">
      {/* Google Calendar card */}
      <button
        type="button"
        onClick={handleConnect}
        className="group w-full border border-base-300 bg-base-100 p-5 text-left transition hover:border-primary hover:bg-base-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center border border-base-300 bg-base-100">
            <GoogleLogo size={24} weight="bold" className="text-[#4285F4]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Google Calendar</p>
            <p className="text-sm text-muted-foreground">
              Sync events and block busy times automatically
            </p>
          </div>
        </div>
      </button>

      {/* Benefits list */}
      <ul className="space-y-2 text-sm text-muted-foreground">
        {[
          'Block times when you already have meetings',
          'Add new bookings to your calendar automatically',
          'Generate Google Meet links for video meetings',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <CheckCircle size={15} weight="fill" className="shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button className="w-full" onClick={handleConnect} disabled={loading}>
          <GoogleLogo size={16} weight="bold" className="mr-2" />
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleSkip}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Skip for now'}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onBack} disabled={loading}>
          Back
        </Button>
      </div>
    </div>
  )
}
