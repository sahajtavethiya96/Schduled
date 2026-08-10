"use client";

import {
  ArrowSquareOut,
  Globe,
  GoogleLogo,
  MapPin,
  PhoneIncoming,
  PhoneOutgoing,
  Screencast,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
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
import type { MeetingIntegrations } from "@/lib/integrations/status";
import { cn, dialCodeFromTz, extractDialCode } from "@/lib/utils";
import type { BuilderFormValues } from "./builder";

// Search Google Maps for whatever's already typed (so the host can fine-tune
// the pin, then copy the resulting Maps link back into the field) — falls
// back to opening Maps blank when the field is still empty.
function openGoogleMaps(currentValue: string) {
  const trimmed = currentValue.trim();
  const url = trimmed
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
    : "https://www.google.com/maps";
  window.open(url, "_blank", "noopener,noreferrer");
}

type LocationType = BuilderFormValues["locationType"];

function detectDialCode(): string {
  try {
    return dialCodeFromTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "";
  }
}

function getAddressPlaceholderForTz(tz: string): string {
  const exact: Record<string, string> = {
    "Asia/Kolkata": "e.g. Shop 4, SV Road, Borivali West, Mumbai 400092",
    "Asia/Calcutta": "e.g. Shop 4, SV Road, Borivali West, Mumbai 400092",
    "Asia/Tokyo": "e.g. 1-1-1 Shinjuku, Shinjuku-ku, Tokyo 160-0022",
    "Asia/Shanghai": "e.g. 123 Nanjing Rd, Huangpu, Shanghai 200001",
    "Asia/Hong_Kong": "e.g. 123 Nathan Road, Tsim Sha Tsui, Hong Kong",
    "Asia/Singapore": "e.g. 123 Orchard Road, Singapore 238856",
    "Asia/Dubai": "e.g. Shop 12, Sheikh Zayed Road, Dubai",
    "Asia/Karachi": "e.g. 123 Shahrah-e-Faisal, Karachi 75600",
    "Asia/Dhaka": "e.g. 123 Gulshan Avenue, Dhaka 1212",
    "Asia/Jakarta": "e.g. Jl. Sudirman No. 123, Jakarta Pusat 10220",
    "Asia/Bangkok": "e.g. 123 Sukhumvit Rd, Bangkok 10110",
    "Asia/Kuala_Lumpur": "e.g. 123 Jalan Ampang, Kuala Lumpur 50450",
    "Asia/Manila": "e.g. 123 Ayala Ave, Makati City, Metro Manila",
    "Australia/Sydney": "e.g. 123 George St, Sydney NSW 2000",
    "Australia/Melbourne": "e.g. 123 Collins St, Melbourne VIC 3000",
    "Australia/Brisbane": "e.g. 123 Queen St, Brisbane QLD 4000",
    "Europe/London": "e.g. 12 High Street, London SW1A 1AA",
    "Europe/Paris": "e.g. 12 Rue de Rivoli, Paris 75001",
    "Europe/Berlin": "e.g. Unter den Linden 12, 10117 Berlin",
    "Europe/Amsterdam": "e.g. Damrak 12, 1012 LG Amsterdam",
    "Europe/Rome": "e.g. Via Nazionale 12, 00184 Roma",
    "Europe/Madrid": "e.g. Calle Gran Vía 12, 28013 Madrid",
    "America/New_York": "e.g. 123 Main St, New York, NY 10001",
    "America/Los_Angeles": "e.g. 123 Main St, Los Angeles, CA 90001",
    "America/Chicago": "e.g. 123 Main St, Chicago, IL 60601",
    "America/Toronto": "e.g. 123 King St W, Toronto, ON M5X 1A1",
    "America/Vancouver": "e.g. 123 Granville St, Vancouver, BC V6C 1T2",
    "America/Sao_Paulo": "e.g. Rua da Consolação 123, São Paulo SP 01301-000",
    "America/Mexico_City":
      "e.g. Av. Insurgentes Sur 123, Ciudad de México 06600",
    "Africa/Johannesburg": "e.g. 123 Main Road, Cape Town 8001",
    "Africa/Lagos": "e.g. 123 Victoria Island, Lagos 106104",
    "Africa/Nairobi": "e.g. 123 Kenyatta Avenue, Nairobi 00100",
  };
  if (exact[tz]) {
    return exact[tz];
  }
  if (tz.startsWith("Asia/")) {
    return "e.g. 123 Main Road, Singapore 018989";
  }
  if (tz.startsWith("Europe/")) {
    return "e.g. 12 High Street, London SW1A 1AA";
  }
  if (tz.startsWith("America/")) {
    return "e.g. 123 Main St, New York, NY 10001";
  }
  if (tz.startsWith("Australia/")) {
    return "e.g. 123 George St, Sydney NSW 2000";
  }
  if (tz.startsWith("Pacific/")) {
    return "e.g. 123 Queen St, Auckland 1010";
  }
  if (tz.startsWith("Africa/")) {
    return "e.g. 123 Main Road, Cape Town 8001";
  }
  return "e.g. 123 Main St";
}

// ── Location options ──────────────────────────────────────────────────────────

interface LocationOption {
  comingSoon?: boolean;
  icon: React.ReactNode;
  label: string;
  requiresPhone?: boolean;
  requiresValue?: boolean;
  sub: string;
  value: LocationType;
  valueLabel?: string;
  valuePlaceholder?: string;
}

const LOCATION_OPTIONS: LocationOption[] = [
  {
    value: "google_meet",
    label: "Google Meet",
    sub: "Auto-generate a Google Meet link for each booking.",
    icon: <GoogleLogo className="text-[#4285F4]" size={22} weight="bold" />,
  },
  {
    value: "zoom",
    label: "Zoom",
    sub: "Auto-generate a Zoom meeting link for each booking.",
    icon: <VideoCamera className="text-[#2D8CFF]" size={22} weight="fill" />,
  },
  {
    value: "phone_host_calls",
    label: "Phone call (you call)",
    sub: "You call the invitee. They provide their number when booking.",
    icon: <PhoneOutgoing className="text-primary" size={22} weight="fill" />,
  },
  {
    value: "phone_invitee_calls",
    label: "Phone call (they call)",
    sub: "The invitee calls you on your phone number.",
    icon: <PhoneIncoming className="text-primary" size={22} weight="fill" />,
    requiresPhone: true,
  },
  {
    value: "in_person",
    label: "In-person",
    sub: "Specify a physical address where you will meet.",
    icon: <MapPin className="text-orange-500" size={22} weight="fill" />,
    requiresValue: true,
    valueLabel: "Location address",
  },
  {
    value: "custom",
    label: "Custom",
    sub: "Provide your own meeting link or description.",
    icon: <Globe className="text-muted-foreground" size={22} weight="fill" />,
    requiresValue: true,
    valuePlaceholder: "e.g. https://meet.example.com/my-room",
    valueLabel: "Custom location",
  },
  {
    value: "invitees_choice",
    label: "Invitee's choice",
    sub: "Let the invitee choose their preferred meeting type.",
    icon: (
      <Screencast className="text-muted-foreground" size={22} weight="fill" />
    ),
    comingSoon: true,
  },
];

const LS_KEY = "schduled:lastPhoneNumber";

// E.164 caps the whole number (dial code + local number) at 15 digits; the
// local number field enforces its own 4–15 digit range so a bare paste of
// garbage digits can't produce an unusably long value.
const MIN_LOCAL_DIGITS = 4;
const MAX_LOCAL_DIGITS = 15;

// Truncate `raw` so it contains at most `maxDigits` digit characters,
// preserving any formatting characters (space, -, (, )) up to that point.
function capDigits(raw: string, maxDigits: number): string {
  let digitCount = 0;
  for (let i = 0; i < raw.length; i++) {
    if (/\d/.test(raw[i])) {
      digitCount++;
      if (digitCount > maxDigits) {
        return raw.slice(0, i);
      }
    }
  }
  return raw;
}

// ── Smart phone input ─────────────────────────────────────────────────────────

// Strip a leading dial code (plus any separator after it) from a stored value,
// leaving only the local number — so the number field never re-displays the
// code that's already shown in the dial code field.
function stripDialCode(value: string, dialCode: string): string {
  let v = value ?? "";
  if (dialCode && v.startsWith(dialCode)) {
    v = v.slice(dialCode.length);
  }
  return v.replace(/^[\s\-().]+/, "");
}

function PhoneInput({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const initialized = useRef(false);

  // Dial code: the code the host typed (matched against known country codes,
  // so "+918790056786" → "+91"); when none is typed, fall back to the code
  // derived from their timezone — so it always shows a sensible code (e.g. +91).
  const dialCode = extractDialCode(value ?? "") || detectDialCode() || "+1";
  const localNumber = stripDialCode(value ?? "", dialCode);

  // Auto-fill on first mount only (new event or switching to phone type)
  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Priority 1: already has a value (edit mode) — leave it alone
    if (value && value.trim()) {
      return;
    }

    // Priority 2: localStorage (last number used)
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved && saved.trim()) {
        onChange(saved.trim());
      }
    } catch {
      /* ignore */
    }
    // Priority 3 (no saved number): leave the number blank — the dial code
    // field already shows the timezone-detected code, so there's nothing
    // to pre-fill into the stored value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function composeAndEmit(nextDialCode: string, nextLocalNumber: string) {
    const trimmedNumber = nextLocalNumber.trim();
    onChange(trimmedNumber ? `${nextDialCode} ${trimmedNumber}` : "");
  }

  function handleDialCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d+]/g, "");
    raw = "+" + raw.replace(/\+/g, "");
    composeAndEmit(raw, localNumber);
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d\s\-().]/g, "");
    raw = capDigits(raw, MAX_LOCAL_DIGITS);
    composeAndEmit(dialCode, raw);
  }

  function handleBlur() {
    const trimmed = (value ?? "").trim();
    // Persist valid-looking numbers to localStorage
    if (trimmed.length > 5) {
      try {
        localStorage.setItem(LS_KEY, trimmed);
      } catch {
        /* ignore */
      }
    }
    onBlur?.();
  }

  return (
    <div className="flex items-stretch gap-2">
      <Input
        aria-label="Country dial code"
        className="w-20 shrink-0 font-mono"
        onBlur={handleBlur}
        onChange={handleDialCodeChange}
        placeholder="+91"
        type="tel"
        value={dialCode}
      />
      <Input
        aria-label="Phone number"
        className="flex-1 font-mono"
        maxLength={20}
        onBlur={handleBlur}
        onChange={handleNumberChange}
        placeholder="98765 43210"
        type="tel"
        value={localNumber}
      />
    </div>
  );
}

// ── Tab component ─────────────────────────────────────────────────────────────

interface TabLocationProps {
  form: UseFormReturn<BuilderFormValues>;
  integrations?: MeetingIntegrations;
}

export function TabLocation({
  form,
  integrations = { googleConnected: false, zoomConnected: false },
}: TabLocationProps) {
  const locationType = form.watch("locationType");
  const selected = LOCATION_OPTIONS.find((o) => o.value === locationType);
  const addressPlaceholder = getAddressPlaceholderForTz(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Where will this meeting take place?
        </p>
      </div>

      <Separator />

      <FormField
        control={form.control}
        name="locationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Location type</FormLabel>
            <div className="grid grid-cols-1 gap-2">
              {LOCATION_OPTIONS.map((opt) => {
                const isSelected = field.value === opt.value;
                const isDisabled = opt.comingSoon && !isSelected;
                const showWarning =
                  isSelected &&
                  ((opt.value === "google_meet" &&
                    !integrations.googleConnected) ||
                    (opt.value === "zoom" && !integrations.zoomConnected));
                const warningProvider =
                  opt.value === "zoom" ? "Zoom" : "Google Calendar";
                return (
                  <div key={opt.value}>
                    <button
                      className={cn(
                        "flex w-full items-start gap-4 border p-4 text-left transition",
                        isSelected
                          ? showWarning
                            ? "border-amber-400 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                            : "border-primary bg-primary/5 ring-1 ring-primary"
                          : isDisabled
                            ? "border-base-300 bg-base-200/30 opacity-60 cursor-not-allowed"
                            : "border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200/30"
                      )}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) {
                          return;
                        }
                        field.onChange(opt.value);
                        // Clear per-type fields the new type doesn't use, so a
                        // stale value (e.g. the dial-code PhoneInput auto-fills)
                        // can't fail the Location step's validation.
                        if (!opt.requiresPhone) {
                          form.setValue("hostPhoneNumber", "", {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                        if (!opt.requiresValue) {
                          form.setValue("locationValue", "", {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      type="button"
                    >
                      <span className="mt-0.5 shrink-0">{opt.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {opt.label}
                          </span>
                          {opt.comingSoon && (
                            <span className="inline-flex items-center bg-teal-600 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-white">
                              Coming soon
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {opt.sub}
                        </span>
                      </span>
                      {!isDisabled && (
                        <span
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition",
                            isSelected
                              ? showWarning
                                ? "border-amber-500 bg-amber-500"
                                : "border-primary bg-primary"
                              : "border-base-300"
                          )}
                        />
                      )}
                    </button>
                    {showWarning && (
                      <div className="flex items-start gap-3 border border-t-0 border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
                        <Warning
                          className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                          size={16}
                          weight="fill"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            Connect {warningProvider} to generate meeting links
                          </p>
                          <p className="mt-0.5 text-xs text-amber-700/90 dark:text-amber-300/80">
                            You haven&apos;t connected {warningProvider} yet, so
                            bookings won&apos;t include a{" "}
                            {opt.value === "zoom" ? "Zoom" : "Google Meet"} link
                            until you do.
                          </p>
                          <Link
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
                            href="/settings/integrations"
                            target="_blank"
                          >
                            Connect {warningProvider}
                            <ArrowSquareOut size={12} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom location / in-person address */}
      {selected?.requiresValue && (
        <FormField
          control={form.control}
          name="locationValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{selected.valueLabel}</FormLabel>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FormControl>
                    {locationType === "in_person" ? (
                      <AddressAutocomplete
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        placeholder={addressPlaceholder}
                        value={field.value ?? ""}
                      />
                    ) : (
                      <Input
                        placeholder={selected.valuePlaceholder}
                        {...field}
                        value={field.value ?? ""}
                      />
                    )}
                  </FormControl>
                </div>
                <Button
                  className="shrink-0 gap-1.5"
                  onClick={() => openGoogleMaps(field.value ?? "")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <MapPin size={13} />
                  Open in Google Maps
                </Button>
              </div>
              {locationType === "in_person" ? (
                <FormDescription>
                  Start typing to search for an address, or enter it manually —
                  or open Google Maps, find the spot, and paste its link here.
                </FormDescription>
              ) : (
                <FormDescription>
                  Or open Google Maps, copy the link to your venue, and paste it
                  here.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Phone number — with dial code prefix and validation */}
      {selected?.requiresPhone && (
        <FormField
          control={form.control}
          name="hostPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your phone number</FormLabel>
              <FormControl>
                <PhoneInput
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Shown to invitees so they know how to reach you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
