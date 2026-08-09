'use client'

import { useState, useTransition } from 'react'
import { EnvelopeSimple, Globe, Plus, Prohibit, Trash, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { addBlocklistEntry, removeBlocklistEntry } from '@/app/actions/security'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface BlocklistEntry {
  id: string
  pattern: string
  type: 'email' | 'domain'
  note: string | null
  createdAt: Date
}

export function BlockedSourcesCard({ entries: initial }: { entries: BlocklistEntry[] }) {
  const [entries, setEntries] = useState(initial)
  const [pattern, setPattern] = useState('')
  const [type, setType] = useState<'email' | 'domain'>('email')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleAdd() {
    setError(null)
    startTransition(async () => {
      const res = await addBlocklistEntry(pattern, type, note)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setEntries((prev) => [
        ...prev,
        { id: crypto.randomUUID(), pattern: pattern.trim().toLowerCase(), type, note: note.trim() || null, createdAt: new Date() },
      ])
      setPattern('')
      setNote('')
      toast.success('Blocked source added')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeBlocklistEntry(id)
      if ('error' in res) { toast.error(res.error); return }
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast.success('Removed from blocklist')
    })
    setDeleteId(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Prohibit size={18} className="text-primary" />
            <CardTitle>Blocked Sources</CardTitle>
          </div>
          <CardDescription>
            Block specific email addresses or entire domains from booking any of your meeting types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Add form */}
          <div className="border border-base-300 bg-base-200/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add blocked source</p>
            <div className="flex gap-2 flex-wrap">
              {/* Type selector */}
              <div className="flex border border-input">
                <button
                  type="button"
                  onClick={() => setType('email')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    type === 'email' ? 'bg-primary text-primary-content' : 'bg-base-100 text-muted-foreground hover:bg-base-200'
                  }`}
                >
                  <EnvelopeSimple size={14} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setType('domain')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    type === 'domain' ? 'bg-primary text-primary-content' : 'bg-base-100 text-muted-foreground hover:bg-base-200'
                  }`}
                >
                  <Globe size={14} /> Domain
                </button>
              </div>
              <Input
                type="text"
                value={pattern}
                onChange={(e) => { setPattern(e.target.value); setError(null) }}
                placeholder={type === 'email' ? 'spam@example.com' : 'example.com'}
                className="flex-1 min-w-[180px]"
              />
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 min-w-[140px]"
              />
              <Button type="button" size="sm" className="gap-1.5" onClick={handleAdd} disabled={!pattern.trim()}>
                <Plus size={14} /> Block
              </Button>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-error">
                <Warning size={14} /> {error}
              </p>
            )}
          </div>

          {/* Blocklist */}
          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No blocked sources. Invitees from all email addresses can book your meetings.
            </p>
          ) : (
            <div className="border border-base-300 divide-y divide-base-300">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-base-200/20 transition-colors">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-error/10 text-error">
                    {entry.type === 'email'
                      ? <EnvelopeSimple size={14} />
                      : <Globe size={14} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">{entry.pattern}</span>
                      <Badge variant="secondary" className="text-xs py-0 px-1.5">
                        {entry.type}
                      </Badge>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-error"
                    onClick={() => setDeleteId(entry.id)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove blocked source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow bookings from this email or domain again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteId && handleRemove(deleteId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
