"use client";

import { useActionState } from "react";
import { sendContactMessageAction } from "@/app/actions/contact";
import { PaperPlaneTilt, SpinnerGap } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUBJECTS = [
  "General question",
  "Feature request",
  "Bug report",
  "Self-hosting help",
  "Privacy / data request",
  "Something else",
];

const INITIAL: { ok: boolean; error?: string } = { ok: false };

export function ContactForm() {
  const [state, action, isPending] = useActionState(
    sendContactMessageAction,
    INITIAL
  );

  if (state.ok) {
    return (
      <div className="border border-success/30 bg-success/5 px-6 py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-success/10">
          <PaperPlaneTilt size={24} weight="duotone" className="text-success" />
        </div>
        <p className="font-bold text-base-content">Message sent!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll get back to you at the email you provided, usually within 2 business days.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
            Your Name
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Jane Smith"
            className="h-10 w-full border border-base-300 bg-page px-3 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            className="h-10 w-full border border-base-300 bg-page px-3 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
          Subject
        </label>
        <Select name="subject" required>
          <SelectTrigger className="h-10 w-full text-sm">
            <SelectValue placeholder="Select a topic…" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground">
          Message
        </label>
        <textarea
          name="message"
          required
          rows={6}
          placeholder="Tell us what's on your mind…"
          className="w-full border border-base-300 bg-page px-3 py-2.5 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-3 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <SpinnerGap size={16} className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <PaperPlaneTilt size={16} weight="bold" />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}
