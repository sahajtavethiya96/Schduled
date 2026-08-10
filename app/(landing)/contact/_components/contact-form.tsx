"use client";

import { PaperPlaneTilt, SpinnerGap } from "@phosphor-icons/react";
import { useActionState } from "react";
import { sendContactMessageAction } from "@/app/actions/contact";
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
          <PaperPlaneTilt className="text-success" size={24} weight="duotone" />
        </div>
        <p className="font-bold text-base-content">Message sent!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll get back to you at the email you provided, usually within 2
          business days.
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
          <label
            className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground"
            htmlFor="contact-name"
          >
            Your Name
          </label>
          <input
            className="h-10 w-full border border-base-300 bg-page px-3 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            id="contact-name"
            name="name"
            placeholder="Jane Smith"
            required
            type="text"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground"
            htmlFor="contact-email"
          >
            Email Address
          </label>
          <input
            className="h-10 w-full border border-base-300 bg-page px-3 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            id="contact-email"
            name="email"
            placeholder="jane@example.com"
            required
            type="email"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground"
          htmlFor="contact-subject"
        >
          Subject
        </label>
        <Select name="subject" required>
          <SelectTrigger className="h-10 w-full text-sm" id="contact-subject">
            <SelectValue placeholder="Select a topic…" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold uppercase tracking-ui text-muted-foreground"
          htmlFor="contact-message"
        >
          Message
        </label>
        <textarea
          className="w-full border border-base-300 bg-page px-3 py-2.5 text-sm text-base-content placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          id="contact-message"
          name="message"
          placeholder="Tell us what's on your mind…"
          required
          rows={6}
        />
      </div>

      <button
        className="inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-3 text-sm font-semibold text-primary-content transition-opacity hover:opacity-90 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <>
            <SpinnerGap className="animate-spin" size={16} />
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
