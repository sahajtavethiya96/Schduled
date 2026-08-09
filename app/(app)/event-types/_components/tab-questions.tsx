'use client'

import { useState, useTransition } from 'react'
import { CaretDown, CaretUp, DotsSixVertical, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { addQuestion, updateQuestion, deleteQuestion, reorderQuestions, type QuestionData } from '@/app/actions/event-types'
import type { ExistingQuestion } from './builder'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const QUESTION_TYPES: { value: QuestionData['type']; label: string; hasOptions: boolean }[] = [
  { value: 'short_text',       label: 'Short text',              hasOptions: false },
  { value: 'long_text',        label: 'Long text',               hasOptions: false },
  { value: 'phone',            label: 'Phone number',            hasOptions: false },
  { value: 'single_select',    label: 'Single select (radio)',   hasOptions: true  },
  { value: 'multiple_select',  label: 'Multiple select (checkboxes)', hasOptions: true  },
  { value: 'dropdown',         label: 'Dropdown',                hasOptions: true  },
]

// Built-in questions that are always present (cannot be deleted)
const BUILTIN_QUESTIONS = [
  { label: 'Name', type: 'short_text', isRequired: true, builtin: true },
  { label: 'Email', type: 'short_text', isRequired: true, builtin: true },
]

interface TabQuestionsProps {
  eventTypeId?: string
  questions: ExistingQuestion[]
  mode: 'create' | 'edit'
  /** Location type — drives the auto-added Phone built-in question. */
  locationType?: string
  pendingQuestions?: ExistingQuestion[]
  onPendingChange?: (next: ExistingQuestion[]) => void
}

function blankForm(): { label: string; type: QuestionData['type']; isRequired: boolean; placeholder: string; options: string; } {
  return { label: '', type: 'short_text', isRequired: false, placeholder: '', options: '' }
}

export function TabQuestions({ eventTypeId, questions: initialQuestions, mode, locationType, pendingQuestions = [], onPendingChange }: TabQuestionsProps) {
  // When the invitee provides their number (host-calls-invitee), a Phone field
  // is auto-collected on the booking form — surface it here as a built-in.
  const builtinQuestions =
    locationType === 'phone_host_calls'
      ? [...BUILTIN_QUESTIONS, { label: 'Phone number', type: 'phone', isRequired: true, builtin: true }]
      : BUILTIN_QUESTIONS
  const [questions, setQuestions] = useState<ExistingQuestion[]>(initialQuestions)
  // In create mode, use parent-controlled pendingQuestions; in edit mode, use local state
  const displayQuestions = mode === 'create' ? pendingQuestions : questions
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExistingQuestion | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(blankForm())
  const [isPending, startTransition] = useTransition()

  const typeHasOptions = QUESTION_TYPES.find((t) => t.value === form.type)?.hasOptions ?? false

  function openNew() {
    setEditing(null)
    setForm(blankForm())
    setDialogOpen(true)
  }

  function openEdit(q: ExistingQuestion) {
    setEditing(q)
    setForm({
      label: q.label,
      type: q.type,
      isRequired: q.isRequired,
      placeholder: q.placeholder ?? '',
      options: q.options?.join('\n') ?? '',
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.label.trim()) { toast.error('Question label is required'); return }

    const parsedOptions = typeHasOptions
      ? form.options.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined

    if (typeHasOptions && (!parsedOptions || parsedOptions.length < 1)) {
      toast.error('Add at least one option for this question type')
      return
    }

    const data: QuestionData = {
      label: form.label.trim(),
      type: form.type,
      isRequired: form.isRequired,
      placeholder: form.placeholder || undefined,
      options: parsedOptions,
    }

    if (mode === 'create') {
      if (editing) {
        onPendingChange?.(pendingQuestions.map((q) =>
          q.id === editing.id
            ? { ...q, label: data.label, type: data.type, isRequired: data.isRequired,
                options: data.options ?? null, placeholder: data.placeholder ?? null }
            : q
        ))
        toast.success('Question updated')
      } else {
        const tmpId = `tmp-${pendingQuestions.length}-${data.label.slice(0, 6)}`
        onPendingChange?.([
          ...pendingQuestions,
          { id: tmpId, label: data.label, type: data.type, isRequired: data.isRequired,
            options: data.options ?? null, placeholder: data.placeholder ?? null,
            position: pendingQuestions.length, isActive: true },
        ])
        toast.success('Question added')
      }
      setDialogOpen(false)
      return
    }

    if (!eventTypeId) { toast.error('Event type ID missing'); return }

    startTransition(async () => {
      if (editing) {
        const res = await updateQuestion(editing.id, data)
        if ('error' in res) { toast.error(res.error); return }
        setQuestions((prev) => prev.map((q) => q.id === editing.id ? { ...q, ...data } : q))
        toast.success('Question updated')
      } else {
        const res = await addQuestion(eventTypeId, data)
        if ('error' in res) { toast.error(res.error); return }
        setQuestions((prev) => [
          ...prev,
          { id: res.id, label: data.label, type: data.type, isRequired: data.isRequired,
            options: data.options ?? null, placeholder: data.placeholder ?? null,
            position: prev.length, isActive: true },
        ])
        toast.success('Question added')
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(id: string) {
    if (mode === 'create') {
      onPendingChange?.(pendingQuestions.filter((q) => q.id !== id))
      return
    }
    startTransition(async () => {
      const res = await deleteQuestion(id)
      if ('error' in res) { toast.error(res.error); return }
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      toast.success('Question removed')
    })
  }

  function persistReorder(prev: ExistingQuestion[], next: ExistingQuestion[]) {
    if (!eventTypeId) return
    startTransition(async () => {
      const res = await reorderQuestions(eventTypeId, next.map((q) => q.id))
      if (res && 'error' in res) {
        setQuestions(prev) // roll back the optimistic reorder
        toast.error(res.error)
      }
    })
  }

  function moveUp(index: number) {
    if (index === 0) return
    if (mode === 'create') {
      const next = [...pendingQuestions]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      onPendingChange?.(next)
      return
    }
    const prev = questions
    const next = [...questions]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setQuestions(next)
    persistReorder(prev, next)
  }

  function moveDown(index: number) {
    if (index === displayQuestions.length - 1) return
    if (mode === 'create') {
      const next = [...pendingQuestions]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      onPendingChange?.(next)
      return
    }
    const prev = questions
    const next = [...questions]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setQuestions(next)
    persistReorder(prev, next)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Questions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Collect information from invitees when they book.
        </p>
      </div>

      <Separator />

      {/* Built-in questions (always present) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Always included</p>
        {builtinQuestions.map((q) => (
          <div key={q.label} className="flex items-center gap-3 border border-base-300 bg-base-200/30 px-4 py-3">
            <DotsSixVertical size={14} className="text-muted-foreground/30" />
            <span className="flex-1 text-sm">{q.label}</span>
            <Badge variant="outline" className="text-xs">Required</Badge>
            <Badge variant="secondary" className="text-xs">Built-in</Badge>
          </div>
        ))}
      </div>

      {/* Custom questions */}
      {displayQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom questions added. Invitees will only be asked for their name and email.
        </p>
      )}
      {displayQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom questions</p>
          {displayQuestions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-3 border border-base-300 bg-base-100 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="Move question up"
                  onClick={() => moveUp(i)}
                  disabled={i === 0 || isPending}
                  className="flex items-center justify-center text-muted-foreground hover:text-base-content disabled:opacity-30"
                ><CaretUp size={10} weight="bold" /></button>
                <DotsSixVertical size={14} className="text-muted-foreground/50" />
                <button
                  type="button"
                  aria-label="Move question down"
                  onClick={() => moveDown(i)}
                  disabled={i === displayQuestions.length - 1 || isPending}
                  className="flex items-center justify-center text-muted-foreground hover:text-base-content disabled:opacity-30"
                ><CaretDown size={10} weight="bold" /></button>
              </div>
              <span className="flex-1 min-w-0">
                <span className="block text-sm">{q.label}</span>
                <span className="text-xs text-muted-foreground">
                  {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
                </span>
              </span>
              {q.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => openEdit(q)}
                type="button"
              >
                <PencilSimple size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-error/70 hover:text-error"
                onClick={() => setDeleteConfirmId(q.id)}
                disabled={isPending}
                type="button"
              >
                <Trash size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={openNew}>
        <Plus size={14} /> Add question
      </Button>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{editing ? 'Edit question' : 'Add question'}</DialogTitle>
          <DialogDescription className="sr-only">Configure question details</DialogDescription>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Question label <span className="text-error">*</span></Label>
              <Input
                placeholder="e.g. What would you like to discuss?"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as QuestionData['type'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {typeHasOptions && (
              <div className="space-y-1.5">
                <Label>Options <span className="text-muted-foreground text-xs">(one per line)</span></Label>
                <Textarea
                  placeholder={"Option A\nOption B\nOption C"}
                  rows={4}
                  className="resize-none font-mono text-sm"
                  value={form.options}
                  onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Placeholder text</Label>
              <Input
                placeholder="Optional hint for the invitee"
                value={form.placeholder}
                onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={form.isRequired}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isRequired: v }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Update' : 'Add question'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete question confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This question will be permanently removed from the booking form and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) handleDelete(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Remove question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
