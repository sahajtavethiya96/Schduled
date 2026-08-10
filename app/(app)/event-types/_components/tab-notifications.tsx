"use client";

import { Bell, Check, EnvelopeSimple } from "@phosphor-icons/react";
import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { BuilderFormValues } from "./builder";

interface TabNotificationsProps {
  form: UseFormReturn<BuilderFormValues>;
}

export function TabNotifications({ form }: TabNotificationsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure what happens after someone books this event.
        </p>
      </div>

      <Separator />

      {/* What always happens */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Emails sent automatically</p>
        <div className="space-y-2">
          {[
            {
              icon: <EnvelopeSimple size={15} />,
              label: "Booking confirmation to invitee",
              desc: "Sent immediately after booking, includes meeting details and calendar attachment.",
            },
            {
              icon: <Bell size={15} />,
              label: "Booking notification to you",
              desc: "Sent to your email when someone books this meeting type.",
            },
            {
              icon: <EnvelopeSimple size={15} />,
              label: "Reminders (24h + 1h before)",
              desc: "Sent to both you and the invitee.",
            },
          ].map((item) => (
            <div
              className="flex items-start gap-3 border border-base-300 bg-base-200/20 px-4 py-3"
              key={item.label}
            >
              <span className="mt-0.5 text-primary">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.desc}
                </p>
              </div>
              <Check className="text-primary mt-0.5 shrink-0" size={15} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Manage global notification preferences in{" "}
          <Link
            className="text-primary underline underline-offset-4"
            href="/settings/communication"
          >
            Communication Settings
          </Link>
          .
        </p>
      </div>

      <Separator />

      {/* Custom confirmation note */}
      <FormField
        control={form.control}
        name="confirmationNote"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom confirmation message</FormLabel>
            <FormControl>
              <Textarea
                className="resize-none"
                maxLength={1000}
                placeholder="e.g. Please come prepared with a list of your top goals for the quarter. I look forward to meeting you!"
                rows={4}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormDescription>
              Added to the bottom of the booking confirmation email sent to the
              invitee. Leave empty to use the default message.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
