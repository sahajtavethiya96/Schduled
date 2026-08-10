"use client";

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
import type { BuilderFormValues } from "./builder";

interface TabCancellationProps {
  form: UseFormReturn<BuilderFormValues>;
}

export function TabCancellation({ form }: TabCancellationProps) {
  const allowCancellation = form.watch("allowCancellation");
  const allowRescheduling = form.watch("allowRescheduling");
  const showPolicyText = form.watch("showPolicyText");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Cancellation Policy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control how invitees can cancel or reschedule their booking.
        </p>
      </div>

      <Separator />

      {/* Allow cancellation */}
      <FormField
        control={form.control}
        name="allowCancellation"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div>
              <FormLabel className="text-sm font-medium">
                Allow cancellations
              </FormLabel>
              <FormDescription className="text-xs">
                Invitees can cancel their booking via the cancel link in their
                confirmation email.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {allowCancellation && (
        <FormField
          control={form.control}
          name="cancellationCutoffHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cancellation cutoff</FormLabel>
              <FormControl>
                <div className="flex items-stretch border border-input max-w-[200px]">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0"
                    max={72}
                    min={0}
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10) || 0)
                    }
                  />
                  <span className="flex items-center bg-base-200 px-3 text-xs text-muted-foreground border-l border-input whitespace-nowrap">
                    hours before
                  </span>
                </div>
              </FormControl>
              <FormDescription>
                Invitees cannot cancel within this many hours of the meeting.
                Set to 0 to allow cancellation up to the start time.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <Separator />

      {/* Allow rescheduling */}
      <FormField
        control={form.control}
        name="allowRescheduling"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div>
              <FormLabel className="text-sm font-medium">
                Allow rescheduling
              </FormLabel>
              <FormDescription className="text-xs">
                Invitees can pick a new time via the reschedule link in their
                confirmation email.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {allowRescheduling && (
        <FormField
          control={form.control}
          name="rescheduleCutoffHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reschedule cutoff</FormLabel>
              <FormControl>
                <div className="flex items-stretch border border-input max-w-[200px]">
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0"
                    max={72}
                    min={0}
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10) || 0)
                    }
                  />
                  <span className="flex items-center bg-base-200 px-3 text-xs text-muted-foreground border-l border-input whitespace-nowrap">
                    hours before
                  </span>
                </div>
              </FormControl>
              <FormDescription>
                Invitees cannot reschedule within this many hours of the
                meeting.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <Separator />

      {/* Require cancellation reason */}
      <FormField
        control={form.control}
        name="requireCancellationReason"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div>
              <FormLabel className="text-sm font-medium">
                Require cancellation reason
              </FormLabel>
              <FormDescription className="text-xs">
                Invitees must provide a reason when they cancel.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <Separator />

      {/* Show policy text */}
      <FormField
        control={form.control}
        name="showPolicyText"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div>
              <FormLabel className="text-sm font-medium">
                Show cancellation policy on booking page
              </FormLabel>
              <FormDescription className="text-xs">
                Display the policy text below on your public booking page.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {showPolicyText && (
        <FormField
          control={form.control}
          name="policyText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy text</FormLabel>
              <FormControl>
                <Textarea
                  className="resize-none"
                  maxLength={1000}
                  placeholder="e.g. Cancellations must be made at least 24 hours in advance. Late cancellations may be subject to a fee."
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
