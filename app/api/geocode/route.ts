import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey } from "@/lib/api/helpers";
import { env } from "@/lib/env";

// Pluggable address autocomplete. Default provider is Photon (OpenStreetMap,
// keyless). If GOOGLE_MAPS_API_KEY or MAPBOX_TOKEN is set the route upgrades to
// that provider automatically (village/street/building coverage); pin a choice
// with GEOCODER_PROVIDER. Autocomplete is best-effort: any failure returns an
// empty list so the address field still works as plain text.

type Provider = "photon" | "google" | "mapbox";

function resolveProvider(): Provider {
  if (env.GEOCODER_PROVIDER) {
    return env.GEOCODER_PROVIDER;
  }
  if (env.MAPBOX_TOKEN) {
    return "mapbox";
  }
  if (env.GOOGLE_MAPS_API_KEY) {
    return "google";
  }
  return "photon";
}

interface Coords {
  lat: number;
  lon: number;
}

// ── Photon (OSM, keyless) ─────────────────────────────────────────────────────
interface PhotonFeature {
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

function photonLabel(f: PhotonFeature): string | null {
  const p = f.properties;
  if (!p) {
    return null;
  }
  const parts: string[] = [];
  if (p.name) {
    parts.push(p.name);
  }
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  if (street && street !== p.name) {
    parts.push(street);
  }
  for (const v of [
    p.city ?? p.district,
    p.county,
    p.state,
    p.postcode,
    p.country,
  ]) {
    if (v) {
      parts.push(v);
    }
  }
  const seen = new Set<string>();
  const label = parts
    .filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
    .join(", ");
  return label || null;
}

async function photon(
  q: string,
  coords: Coords | null,
  signal: AbortSignal
): Promise<string[]> {
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
  // lat/lon bias surfaces nearby places (e.g. a local village) above far-away
  // big cities with the same name.
  if (coords) {
    url += `&lat=${coords.lat}&lon=${coords.lon}&location_bias_scale=0.6`;
  }
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "Schduled/1.0 (address autocomplete)" },
  });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map(photonLabel).filter((l): l is string => !!l);
}

// ── Google Places Autocomplete ────────────────────────────────────────────────
async function google(
  q: string,
  coords: Coords | null,
  signal: AbortSignal
): Promise<string[]> {
  const key = env.GOOGLE_MAPS_API_KEY!;
  let url =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
    `?input=${encodeURIComponent(q)}&types=geocode&key=${key}`;
  if (coords) {
    url += `&locationbias=circle:30000@${coords.lat},${coords.lon}`;
  }
  const res = await fetch(url, { signal });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as {
    predictions?: { description?: string }[];
  };
  return (data.predictions ?? [])
    .map((p) => p.description)
    .filter((d): d is string => !!d);
}

// ── Mapbox Geocoding ──────────────────────────────────────────────────────────
async function mapbox(
  q: string,
  coords: Coords | null,
  signal: AbortSignal
): Promise<string[]> {
  const token = env.MAPBOX_TOKEN!;
  let url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&autocomplete=true&limit=6`;
  if (coords) {
    url += `&proximity=${coords.lon},${coords.lat}`;
  }
  const res = await fetch(url, { signal });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { features?: { place_name?: string }[] };
  return (data.features ?? [])
    .map((f) => f.place_name)
    .filter((p): p is string => !!p);
}

function parseCoords(params: URLSearchParams): Coords | null {
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    (lat !== 0 || lon !== 0)
  ) {
    return { lat, lon };
  }
  return null;
}

export async function GET(request: Request) {
  if (
    !(await checkRateLimit(
      rateLimitKey("GET:/api/geocode", request),
      30,
      60_000
    ))
  ) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const coords = parseCoords(params);
  const provider = resolveProvider();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const lookup =
      provider === "google" ? google : provider === "mapbox" ? mapbox : photon;
    const labels = await lookup(q, coords, controller.signal);

    // De-dupe + cap.
    const seen = new Set<string>();
    const suggestions = labels
      .filter((l) => (seen.has(l) ? false : (seen.add(l), true)))
      .slice(0, 6)
      .map((label) => ({ label }));

    return NextResponse.json({ suggestions });
  } catch {
    // Network error / timeout / abort — degrade silently to no suggestions.
    return NextResponse.json({ suggestions: [] });
  } finally {
    clearTimeout(timeout);
  }
}
