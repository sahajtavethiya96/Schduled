'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Trash, WarningCircle, Envelope, CheckCircle, ArrowRight, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { deleteAccountAction, sendDeleteCodeAction, type ActionState } from '@/app/actions/profile'

const REASONS = [
  { value: "not_using",    label: "I'm not using it anymore" },
  { value: "found_better", label: "I found a better alternative" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "technical",    label: "Too many technical issues" },
  { value: "privacy",      label: "Privacy or data concerns" },
  { value: "other",        label: "Other reason" },
] as const

const TOTAL_STEPS = 3

interface Props {
  email: string
}

const RESEND_COOLDOWN = 60 // seconds before resend is allowed

export function DeleteAccountModal({ email }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendState, setSendState] = useState<ActionState>({})
  const [isSending, startSending] = useTransition()
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [deleteState, deleteAction, deleting] = useActionState(
    deleteAccountAction,
    {} as ActionState,
  )

  // Start the resend countdown
  function startCountdown() {
    setCountdown(RESEND_COOLDOWN)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  // Clear timer when modal closes
  useEffect(() => {
    if (!open && timerRef.current) clearInterval(timerRef.current)
  }, [open])

  function handleOpen() {
    setOpen(true)
    setStep(1)
    setReason('')
    setOtherReason('')
    setCodeSent(false)
    setSendState({})
    setCountdown(0)
  }

  function handleClose() {
    if (deleting) return
    setOpen(false)
  }

  function handleSendCode() {
    startSending(async () => {
      const result = await sendDeleteCodeAction()
      setSendState(result)
      if ('success' in result) {
        setCodeSent(true)
        startCountdown()
      }
    })
  }

  function handleResend() {
    setCodeSent(false)
    setSendState({})
    setCountdown(0)
    handleSendCode()
  }

  const effectiveReason = reason === 'other'
    ? (otherReason.trim() || 'Other reason')
    : REASONS.find((r) => r.value === reason)?.label ?? ''

  const progressPct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <>
      <Button variant="destructive" size="sm" onClick={handleOpen}>
        <Trash size={15} className="mr-2" />
        Delete Account
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-md w-full p-0 gap-0 overflow-hidden"
          onInteractOutside={(e) => { if (deleting) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (deleting) e.preventDefault() }}
        >
          <DialogTitle className="sr-only">Delete account — Step {step} of {TOTAL_STEPS}</DialogTitle>
          <DialogDescription className="sr-only">Permanently delete your Schduled account.</DialogDescription>

          {/* Progress bar */}
          <div className="h-1 w-full bg-base-200">
            <div
              className="h-full bg-error transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="px-6 pt-5 pb-0">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>

          <div className="px-6 pb-6 pt-3">

            {/* ── Step 1: Reason ────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Why are you leaving?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your feedback helps us improve Schduled for everyone.
                  </p>
                </div>

                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      className={cn(
                        'w-full flex items-center gap-3 border px-4 py-3 text-left text-sm transition',
                        reason === r.value
                          ? 'border-error bg-error/5 ring-1 ring-error'
                          : 'border-base-300 bg-base-100 hover:border-error/50 hover:bg-base-200/30',
                      )}
                    >
                      <span
                        className={cn(
                          'h-4 w-4 shrink-0 border-2 transition',
                          reason === r.value ? 'border-error bg-error' : 'border-muted-foreground',
                        )}
                      />
                      {r.label}
                    </button>
                  ))}

                  {reason === 'other' && (
                    <Input
                      autoFocus
                      className="mt-1"
                      maxLength={200}
                      placeholder="Tell us more (optional)"
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                    />
                  )}
                </div>

                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={!reason}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight size={15} className="ml-2" />
                </Button>
              </div>
            )}

            {/* ── Step 2: Email code verification ──────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Verify your identity</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll send a 6-digit code to{' '}
                    <strong className="text-base-content">{email}</strong> to confirm
                    it&apos;s really you.
                  </p>
                </div>

                {!codeSent ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 border border-base-300 bg-base-200/40 p-4">
                      <Envelope size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Confirmation code via email</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          A 6-digit code will be sent to {email}. It expires in 15 minutes.
                        </p>
                      </div>
                    </div>

                    {sendState.error && (
                      <p className="text-sm text-error">{sendState.error}</p>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleSendCode}
                      disabled={isSending}
                    >
                      <Envelope size={15} className="mr-2" />
                      {isSending ? 'Sending…' : 'Send confirmation code'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 border border-primary/20 bg-primary/[0.06] p-4">
                      <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-base-content">Code sent!</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Check your inbox at <strong>{email}</strong>.
                          It expires in 15 minutes.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Didn&apos;t receive it?</p>
                      {countdown > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Resend available in{' '}
                          <span className="font-semibold tabular-nums text-base-content">
                            {countdown}s
                          </span>
                        </p>
                      ) : (
                      <button
                        type="button"
                        className="text-xs text-primary underline-offset-2 hover:underline"
                        onClick={handleResend}
                      >
                        Resend code
                      </button>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setStep(3)}
                    >
                      I got the code <ArrowRight size={15} className="ml-2" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Final deletion confirm ────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <WarningCircle size={22} weight="fill" className="text-error shrink-0" />
                    <h2 className="text-lg font-bold text-error">Permanently delete account</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This action <strong className="text-base-content">cannot be undone</strong>. The
                    following will be permanently removed:
                  </p>
                </div>

                <ul className="space-y-1.5 text-sm">
                  {[
                    'Your profile and account settings',
                    'All meeting types you created',
                    'Your availability schedules',
                    'All connected calendars',
                    'All active sessions',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-muted-foreground">
                      <X size={13} weight="bold" className="shrink-0 text-error" />
                      {item}
                    </li>
                  ))}
                </ul>

                <form action={deleteAction} className="space-y-4">
                  {/* Hidden fields carrying reason and a code field */}
                  <input type="hidden" name="reason" value={effectiveReason} />

                  <div className="space-y-1.5">
                    <label htmlFor="del-code" className="block text-sm font-medium">
                      Enter the 6-digit code from your email
                    </label>
                    <Input
                      autoComplete="off"
                      id="del-code"
                      inputMode="numeric"
                      maxLength={6}
                      name="code"
                      placeholder="000000"
                      required
                    />
                  </div>

                  {deleteState.error && (
                    <p className="text-sm text-error">{deleteState.error}</p>
                  )}

                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                    disabled={deleting}
                  >
                    <Trash size={15} className="mr-2" />
                    {deleting ? 'Deleting account…' : 'Permanently delete my account'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setStep(2)}
                    disabled={deleting}
                  >
                    Back
                  </Button>
                </form>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
