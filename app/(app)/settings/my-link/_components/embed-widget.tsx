"use client";

import { Check, Code, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmbedWidgetProps {
  appUrl: string;
  eventTypes: { slug: string; name: string }[];
  username: string;
}

export function EmbedWidget({
  eventTypes,
  appUrl,
  username,
}: EmbedWidgetProps) {
  const [selected, setSelected] = useState(eventTypes[0]?.slug ?? "");
  const [copied, setCopied] = useState(false);

  const src = `${appUrl}/${username}/${selected}`;
  const snippet = `<iframe\n  src="${src}"\n  width="100%"\n  height="700"\n  frameborder="0"\n></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (eventTypes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code className="text-primary" size={16} />
          <CardTitle className="text-sm">Embed on your website</CardTitle>
        </div>
        <CardDescription>
          Copy the snippet below and paste it into any webpage to embed your
          booking calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eventTypes.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Meeting type
            </Label>
            <Select onValueChange={setSelected} value={selected}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((et) => (
                  <SelectItem key={et.slug} value={et.slug}>
                    {et.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative">
          <pre className="overflow-x-auto border border-base-300 bg-base-200/40 px-4 py-3 font-mono text-xs leading-relaxed text-base-content">
            {snippet}
          </pre>
          <button
            className="absolute right-2 top-2 flex size-7 items-center justify-center border border-base-300 bg-base-100 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            onClick={copy}
            title="Copy embed code"
            type="button"
          >
            {copied ? (
              <Check className="text-primary" size={13} weight="bold" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Preview:{" "}
          <a
            className="text-primary hover:underline"
            href={src}
            rel="noopener noreferrer"
            target="_blank"
          >
            {src}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
