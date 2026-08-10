"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
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
    router.push(
      value === "email" ? "/settings/jobs?tab=email" : "/settings/jobs"
    );
  }

  return (
    // Tabs is uncontrolled after mount, so `key` forces a remount to resync
    // the visible tab when the URL changes via Back/Forward.
    <Tabs
      defaultValue={defaultTab}
      key={defaultTab}
      onValueChange={handleChange}
    >
      <TabsList variant="line">
        <TabsTrigger value="queues">Queues</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>
      <TabsContent className="pt-6" value="queues">
        {queuesSlot}
      </TabsContent>
      <TabsContent className="pt-6" value="email">
        {emailSlot}
      </TabsContent>
    </Tabs>
  );
}
