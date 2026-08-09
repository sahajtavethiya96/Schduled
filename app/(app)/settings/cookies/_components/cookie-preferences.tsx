'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

const STORAGE_KEY = 'schduled_cookie_prefs'

interface CookiePrefs {
  analytics: boolean
  marketing: boolean
}

function loadPrefs(): CookiePrefs {
  if (typeof window === 'undefined') return { analytics: false, marketing: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { analytics: false, marketing: false, ...JSON.parse(raw) }
  } catch {}
  return { analytics: false, marketing: false }
}

export function CookiePreferences() {
  const [prefs, setPrefs]   = useState<CookiePrefs>({ analytics: false, marketing: false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
    setLoaded(true)
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    toast.success('Cookie preferences saved')
  }

  const COOKIE_TYPES = [
    {
      key: 'essential' as const,
      label: 'Essential cookies',
      desc: 'Required for authentication, session management, and core functionality. Cannot be disabled.',
      locked: true,
      value: true,
    },
    {
      key: 'analytics' as const,
      label: 'Analytics cookies',
      desc: 'Help us understand how you use Schduled so we can improve the product. No personal data is sold.',
      locked: false,
      value: loaded ? prefs.analytics : false,
    },
    {
      key: 'marketing' as const,
      label: 'Marketing cookies',
      desc: 'Used to show you relevant Schduled content on other sites. We do not share data with ad networks.',
      locked: false,
      value: loaded ? prefs.marketing : false,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cookie Types</CardTitle>
          <CardDescription>
            Schduled uses cookies to keep you signed in and improve your experience.
            You can opt out of non-essential cookies at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-base-300">
          {COOKIE_TYPES.map((item, i) => (
            <div key={item.key} className={`flex items-start justify-between gap-4 ${i === 0 ? 'pb-4' : 'py-4'}`}>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={item.value}
                disabled={item.locked}
                onCheckedChange={(checked) => {
                  if (item.locked) return
                  setPrefs((p) => ({ ...p, [item.key]: checked }))
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>You have the right to access, correct, or delete your personal data at any time.</p>
          <p>
            To export your data, visit{' '}
            <a href="/profile/profile" className="text-primary underline underline-offset-4">
              Profile Settings
            </a>
            . To delete your account and all associated data, use the Delete Account option on the same page.
          </p>
          <p>We never sell personal data to third parties.</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={handleSave} disabled={!loaded}>
          Save preferences
        </Button>
      </div>
    </div>
  )
}
