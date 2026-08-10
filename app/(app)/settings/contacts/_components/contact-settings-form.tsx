"use client";

import { FloppyDisk, X } from "@phosphor-icons/react";
import { type KeyboardEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateContactSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

function parseTags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function ContactSettingsForm({
  initial,
}: {
  initial: { autoCreateContacts: boolean; excludedContactDomains: string };
}) {
  const [autoCreate, setAutoCreate] = useState(initial.autoCreateContacts);
  const [tags, setTags] = useState<string[]>(
    parseTags(initial.excludedContactDomains)
  );
  const [inputVal, setInputVal] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const entries = parseTags(raw);
    if (!entries.length) {
      return;
    }
    setTags((prev) => Array.from(new Set([...prev, ...entries])));
    setInputVal("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && inputVal === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function handleBlur() {
    if (inputVal.trim()) {
      addTag(inputVal);
    }
  }

  function save() {
    // Flush any text still in the input box before saving
    const pending = parseTags(inputVal);
    const finalTags =
      pending.length > 0 ? Array.from(new Set([...tags, ...pending])) : tags;
    if (pending.length > 0) {
      setTags(finalTags);
      setInputVal("");
    }

    start(async () => {
      const res = await updateContactSettings({
        autoCreateContacts: autoCreate,
        excludedContactDomains: finalTags.join(", "),
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Contact settings saved");
    });
  }

  return (
    <div className="space-y-6">
      <section className="border border-base-300 bg-base-100">
        <div className="border-b border-base-300 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Create new contacts automatically
          </h2>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Auto-create toggle */}
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-base-content">
                Someone books a meeting with you
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                When someone schedules a meeting, their booking information is
                used to create a new contact automatically.
              </p>
            </div>
            <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
          </label>

          {/* Exclusion list — tag chip input */}
          <div className="border-t border-base-300 pt-5">
            <p className="text-sm font-semibold text-base-content">
              Exclude domains or email addresses
            </p>
            <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
              Block specific email addresses (like{" "}
              <strong>person@company.com</strong>) or entire domains (like{" "}
              <strong>company.com</strong>) from being auto-added to your
              contacts.
            </p>

            {/* Tag input box */}
            <div
              className={[
                "flex min-h-[42px] flex-wrap items-center gap-1.5 border border-input bg-base-100 px-3 py-2 text-sm transition-colors",
                autoCreate
                  ? "cursor-text focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                  : "pointer-events-none opacity-50",
              ].join(" ")}
              onClick={() => inputRef.current?.focus()}
            >
              {tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content"
                  key={tag}
                >
                  {tag}
                  <button
                    aria-label={`Remove ${tag}`}
                    className="text-muted-foreground hover:text-base-content transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    type="button"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
              <input
                className="min-w-[200px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
                disabled={!autoCreate}
                onBlur={handleBlur}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  tags.length === 0
                    ? "Type an email or domain, then press Enter or comma…"
                    : ""
                }
                ref={inputRef}
                type="text"
                value={inputVal}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Press{" "}
              <kbd className="rounded-none border border-base-300 px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              or{" "}
              <kbd className="rounded-none border border-base-300 px-1 py-0.5 font-mono text-[10px]">
                ,
              </kbd>{" "}
              to add each entry.
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button className="gap-1.5" disabled={pending} onClick={save}>
          <FloppyDisk size={14} />
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
