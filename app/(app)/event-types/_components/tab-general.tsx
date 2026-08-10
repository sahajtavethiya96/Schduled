"use client";

import { ArrowsClockwise, Stack, User, Users } from "@phosphor-icons/react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BuilderFormValues } from "./builder";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const MEETING_TYPES = [
  {
    id: "one_on_one",
    label: "One-on-One",
    desc: "Single invitee",
    icon: <User size={15} />,
    disabled: false,
  },
  {
    id: "group",
    label: "Group",
    desc: "Coming soon",
    icon: <Users size={15} />,
    disabled: true,
  },
  {
    id: "round_robin",
    label: "Round Robin",
    desc: "Coming soon",
    icon: <ArrowsClockwise size={15} />,
    disabled: true,
  },
  {
    id: "collective",
    label: "Collective",
    desc: "Coming soon",
    icon: <Stack size={15} />,
    disabled: true,
  },
];

interface TabGeneralProps {
  form: UseFormReturn<BuilderFormValues>;
  meetingType: string;
  onMeetingTypeChange: (type: string) => void;
}

export function TabGeneral({
  form,
  meetingType,
  onMeetingTypeChange,
}: TabGeneralProps) {
  const name = form.watch("name");

  // Auto-generate the slug from the name. Color is assigned server-side (not
  // derived from name), so same-named events don't share a color.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on name change; dirtyFields.slug/setValue are read fresh from the stable form instance, not deps to re-trigger on
  useEffect(() => {
    if (!form.formState.dirtyFields.slug) {
      form.setValue("slug", slugify(name), { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-3">Meeting Type</p>
        <div className="grid grid-cols-2 gap-2">
          {MEETING_TYPES.map((mt) => (
            <button
              className={cn(
                "flex items-start gap-2.5 p-3 border text-left transition-colors",
                mt.disabled
                  ? "border-base-300 opacity-40 cursor-not-allowed"
                  : meetingType === mt.id
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/40 hover:bg-base-200/40"
              )}
              disabled={mt.disabled}
              key={mt.id}
              onClick={() => !mt.disabled && onMeetingTypeChange(mt.id)}
              type="button"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  mt.disabled
                    ? "text-muted-foreground"
                    : meetingType === mt.id
                      ? "text-primary"
                      : "text-muted-foreground"
                )}
              >
                {mt.icon}
              </span>
              <div>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    mt.disabled ? "text-muted-foreground" : "text-base-content"
                  )}
                >
                  {mt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mt.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Event name <span className="text-error">*</span>
            </FormLabel>
            <FormControl>
              <Input
                maxLength={100}
                placeholder="e.g. 30 Minute Meeting"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                className="resize-none"
                maxLength={500}
                placeholder="What should invitees know about this meeting?"
                rows={3}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormDescription>Shown on your booking page.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      <FormField
        control={form.control}
        name="requiresApproval"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div>
              <FormLabel className="text-sm font-medium">
                Require Approval
              </FormLabel>
              <FormDescription className="text-xs">
                Bookings won&apos;t be confirmed until you approve them.
                You&apos;ll receive an email to review each request.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
