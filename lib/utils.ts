import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Ref callback for Headless UI's floating panels (ListboxOptions/MenuItems,
// used by components/ui/select.tsx and components/ui/dropdown-menu.tsx).
// Their internal floating-ui positioning (@headlessui/react's
// internal/floating.js) renders the panel fully opaque at (0, 0) for the
// first couple of frames after mount, before its computed top/left take
// visual effect — a brief but fully-visible flash to the wrong corner. Since
// that panel unmounts/remounts on every open (Headless UI's default
// `unmount` behavior), this ref callback fires fresh each time and hides the
// node for two animation frames before revealing it already in place.
export function hideUntilPositioned(node: HTMLElement | null) {
  if (!node) return
  node.style.visibility = "hidden"
  const raf = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      node.style.visibility = ""
    })
  })
  return () => cancelAnimationFrame(raf)
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Never"
  }
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

// Maps deprecated IANA timezone aliases to their current canonical identifiers.
const TZ_ALIAS_MAP: Record<string, string> = {
  'Asia/Calcutta':   'Asia/Kolkata',
  'Asia/Dacca':      'Asia/Dhaka',
  'Asia/Katmandu':   'Asia/Kathmandu',
  'Asia/Rangoon':    'Asia/Yangon',
  'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
  'Pacific/Ponape':  'Pacific/Pohnpei',
  'Pacific/Truk':    'Pacific/Chuuk',
}

/** Resolve a deprecated IANA timezone alias to its current canonical name. */
export function canonicalizeTz(tz: string): string {
  return TZ_ALIAS_MAP[tz] ?? tz
}

/** Canonical name with underscores replaced by spaces, for human display. */
export function normalizeTzName(tz: string): string {
  return canonicalizeTz(tz).replace(/_/g, ' ')
}

// Timezone → international dial code map (shared between event builder + booking calendar)
export const TZ_DIAL: Record<string, string> = {
  'Asia/Kolkata': '+91', 'Asia/Calcutta': '+91',
  'America/New_York': '+1', 'America/Chicago': '+1', 'America/Denver': '+1',
  'America/Los_Angeles': '+1', 'America/Phoenix': '+1', 'America/Anchorage': '+1',
  'America/Toronto': '+1', 'America/Vancouver': '+1', 'Pacific/Honolulu': '+1',
  'Europe/London': '+44',
  'Europe/Paris': '+33', 'Europe/Berlin': '+49', 'Europe/Rome': '+39',
  'Europe/Madrid': '+34', 'Europe/Amsterdam': '+31', 'Europe/Brussels': '+32',
  'Europe/Zurich': '+41', 'Europe/Vienna': '+43', 'Europe/Stockholm': '+46',
  'Europe/Oslo': '+47', 'Europe/Copenhagen': '+45', 'Europe/Helsinki': '+358',
  'Europe/Warsaw': '+48', 'Europe/Prague': '+420', 'Europe/Budapest': '+36',
  'Europe/Bucharest': '+40', 'Europe/Sofia': '+359', 'Europe/Athens': '+30',
  'Europe/Lisbon': '+351',
  'Asia/Dubai': '+971', 'Asia/Riyadh': '+966', 'Asia/Kuwait': '+965',
  'Asia/Qatar': '+974', 'Asia/Bahrain': '+973', 'Asia/Muscat': '+968',
  'Asia/Tehran': '+98', 'Asia/Jerusalem': '+972', 'Asia/Beirut': '+961',
  'Asia/Karachi': '+92', 'Asia/Dhaka': '+880', 'Asia/Colombo': '+94',
  'Asia/Kathmandu': '+977', 'Asia/Katmandu': '+977',
  'Asia/Bangkok': '+66', 'Asia/Singapore': '+65', 'Asia/Kuala_Lumpur': '+60',
  'Asia/Jakarta': '+62', 'Asia/Manila': '+63', 'Asia/Ho_Chi_Minh': '+84',
  'Asia/Rangoon': '+95', 'Asia/Yangon': '+95',
  'Asia/Tokyo': '+81', 'Asia/Seoul': '+82', 'Asia/Shanghai': '+86',
  'Asia/Hong_Kong': '+852', 'Asia/Taipei': '+886', 'Asia/Macau': '+853',
  'Asia/Tashkent': '+998', 'Asia/Almaty': '+7', 'Asia/Tbilisi': '+995',
  'Asia/Baku': '+994', 'Asia/Yerevan': '+374',
  'Europe/Moscow': '+7', 'Asia/Yekaterinburg': '+7',
  'Africa/Lagos': '+234', 'Africa/Nairobi': '+254', 'Africa/Cairo': '+20',
  'Africa/Johannesburg': '+27', 'Africa/Accra': '+233', 'Africa/Casablanca': '+212',
  'Africa/Addis_Ababa': '+251', 'Africa/Dar_es_Salaam': '+255',
  'America/Sao_Paulo': '+55', 'America/Bogota': '+57', 'America/Lima': '+51',
  'America/Santiago': '+56', 'America/Argentina/Buenos_Aires': '+54',
  'America/Mexico_City': '+52', 'America/Caracas': '+58',
  'Australia/Sydney': '+61', 'Australia/Melbourne': '+61', 'Australia/Perth': '+61',
  'Pacific/Auckland': '+64',
}

export function dialCodeFromTz(tz: string): string {
  if (TZ_DIAL[tz]) return TZ_DIAL[tz]
  // Region fallback: America/* → +1, Australia/* → +61
  const region = tz.split('/')[0]
  if (region === 'America') return '+1'
  if (region === 'Australia') return '+61'
  return ''
}

// Known dial codes, longest first — so a typed number like "+918790056786"
// resolves to "+91", not a greedy "+9187".
const KNOWN_DIAL_CODES = Array.from(new Set(Object.values(TZ_DIAL))).sort(
  (a, b) => b.length - a.length
)

/**
 * Extract the international dial code from a phone value by matching against
 * known country codes. Country codes are 1–4 digits and can't be split by a
 * fixed digit count, so we prefix-match the known list (longest first) and
 * fall back to "+" + up to 3 digits.
 */
export function extractDialCode(value: string): string {
  const v = (value ?? '').replace(/[\s\-().]/g, '')
  if (!v.startsWith('+')) return ''
  for (const code of KNOWN_DIAL_CODES) {
    if (v.startsWith(code)) return code
  }
  const m = v.match(/^(\+\d{1,3})/)
  return m ? m[1] : '+'
}

/**
 * Compact page-number list with ellipsis for pagination UIs.
 * e.g. (4, 20) → [1, "ellipsis", 3, 4, 5, "ellipsis", 20]
 */
export function paginationRange(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const out: (number | "ellipsis")[] = []
  let prev = 0
  for (const p of pages) {
    if (p - prev > 1) out.push("ellipsis")
    out.push(p)
    prev = p
  }
  return out
}
