'use client'

import { useState } from 'react'
import { StepProfile } from './step-1-profile'
import { StepTimezone } from './step-2-timezone'
import { StepAvailability } from './step-3-availability'
import { StepCalendar } from './step-4-calendar'
import { StepShareLink } from './step-5-share-link'

const TOTAL_STEPS = 5

const STEP_META = [
  { title: 'Set up your profile',   sub: 'How should people know you?' },
  { title: 'Your timezone',         sub: 'When are you accepting meetings?' },
  { title: 'Your availability',     sub: 'Set your default working hours' },
  { title: 'Connect your calendar', sub: 'Prevent double-bookings automatically' },
  { title: "You're all set!",       sub: 'Start sharing your booking link' },
]

interface Props {
  name: string
  username?: string | null
  // DB onboardingStep (0–4) — how many steps are done. Wizard resumes at dbStep + 1
  // so an OAuth round-trip in step 4 returns the user to step 5.
  onboardingStep?: number
  userImage?: string | null
}

export function OnboardingWizard({ name, username: initialUsername, onboardingStep = 0, userImage }: Props) {
  const startAt = Math.max(1, Math.min(onboardingStep + 1, TOTAL_STEPS))
  const [step, setStep] = useState(startAt)
  const [savedUsername, setSavedUsername] = useState(initialUsername ?? '')

  const { title, sub } = STEP_META[step - 1]
  const progressPct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="w-full max-w-lg border border-base-300 bg-base-100 ring-1 ring-foreground/10">
      {/* Progress bar */}
      <div className="h-1 w-full bg-base-200">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Step label + heading */}
      <div className="px-6 pt-6 pb-0 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </p>
        <h1 className="mt-1 text-xl font-bold">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
      </div>

      {/* Step content */}
      <div className="px-6 pb-6 pt-5 sm:px-8">
        {step === 1 && (
          <StepProfile
            defaultName={name}
            defaultUsername={savedUsername}
            defaultImage={userImage}
            onNext={(username) => { setSavedUsername(username); setStep(2) }}
          />
        )}
        {step === 2 && (
          <StepTimezone onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepAvailability onNext={() => setStep(4)} onBack={() => setStep(2)} />
        )}
        {step === 4 && (
          <StepCalendar onNext={() => setStep(5)} onBack={() => setStep(3)} />
        )}
        {step === 5 && (
          <StepShareLink username={savedUsername} onBack={() => setStep(4)} />
        )}
      </div>
    </div>
  )
}
