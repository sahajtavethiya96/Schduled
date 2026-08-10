"use client";

import { ArrowRight, CheckCircle, Copy } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { useAppOrigin } from "@/hooks/use-app-origin";

interface StepShareLinkProps {
  onBack: () => void;
  username: string;
}

export function StepShareLink({ username, onBack }: StepShareLinkProps) {
  const appOrigin = useAppOrigin();
  const bookingUrl = `${appOrigin}/${username}`;
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const qrRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!username) {
      return;
    }
    let cancelled = false;

    async function buildQr() {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(bookingUrl, {
          width: 160,
          margin: 1,
          color: { dark: "#0d9488", light: "#ffffff" },
        });
        if (!cancelled && qrRef.current) {
          qrRef.current.src = dataUrl;
          qrRef.current.style.display = "block";
        }
      } catch {
        // non-fatal
      }
    }

    buildQr();
    return () => {
      cancelled = true;
    };
  }, [bookingUrl, username]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError("");
    const result = await completeOnboarding();
    if ("error" in result) {
      setFinishing(false);
      setError(result.error);
      return;
    }
    // Hard navigate so the layout fully re-renders (reads onboardingDone=true, modal unmounts)
    // and the user lands directly on their new event type.
    window.location.href = "/event-types";
  }

  return (
    <div className="space-y-6">
      {/* Booking link */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Your booking link
        </p>
        <div className="flex items-center gap-2 border border-base-300 bg-base-200/40 px-4 py-3">
          <span className="min-w-0 truncate font-mono text-sm text-base-content">
            {bookingUrl}
          </span>
          <button
            aria-label="Copy booking link"
            className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <CheckCircle size={15} weight="fill" /> Copied!
              </>
            ) : (
              <>
                <Copy size={15} /> Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Code */}
      {username && (
        <div className="flex flex-col items-center gap-3 border border-base-300 bg-base-100 p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            QR Code
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Booking link QR code"
            className="border border-base-300"
            height={160}
            ref={qrRef}
            style={{ display: "none" }}
            width={160}
          />
          <p className="text-xs text-muted-foreground text-center">
            Let clients scan to book from their phone
          </p>
        </div>
      )}

      {/* What's ready */}
      <ul className="space-y-2 text-sm text-muted-foreground">
        {[
          "Your profile and timezone are saved",
          "Your default availability is set",
          "A 30-minute meeting type is ready to book",
        ].map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <CheckCircle
              className="shrink-0 text-primary"
              size={15}
              weight="fill"
            />
            {item}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={finishing} onClick={handleFinish}>
          {finishing ? (
            "Setting things up…"
          ) : (
            <span className="flex items-center gap-2">
              Go to my Meeting Types <ArrowRight size={16} />
            </span>
          )}
        </Button>
        <Button
          className="text-muted-foreground"
          onClick={onBack}
          size="sm"
          variant="ghost"
        >
          Back
        </Button>
      </div>
    </div>
  );
}
