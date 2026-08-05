"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function JobsTabs({
  defaultTab,
  queuesSlot,
  emailSlot,
}: {
  defaultTab: "queues" | "email";
  queuesSlot: ReactNode;
  emailSlot: ReactNode;
}) {
  const router = useRouter();

  function handleChange(value: string) {
    router.push(value === "email" ? "/settings/jobs?tab=email" : "/settings/jobs");
  }

  return (
    // `key` forces a remount whenever the URL-derived tab changes for a
    // reason other than clicking a trigger (e.g. browser Back/Forward) —
    // Tabs is uncontrolled after mount, so `defaultValue` alone wouldn't
    // resync the visible tab to the address bar.
    <Tabs key={defaultTab} defaultValue={defaultTab} onValueChange={handleChange}>
      <TabsList variant="line">
        <TabsTrigger value="queues">Queues</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>
      <TabsContent value="queues" className="pt-6">{queuesSlot}</TabsContent>
      <TabsContent value="email" className="pt-6">{emailSlot}</TabsContent>
    </Tabs>
  );
}
