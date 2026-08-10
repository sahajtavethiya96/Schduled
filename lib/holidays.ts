import "server-only";
import { getCountryForTimezone } from "countries-and-timezones";
import Holidays from "date-holidays";

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
}
export interface HolidayCountry {
  code: string;
  name: string;
}

// date-holidays ships ~200 countries; cache the code→name map once.
let countriesCache: Record<string, string> | null = null;
function countriesMap(): Record<string, string> {
  if (!countriesCache) {
    countriesCache = new Holidays().getCountries("en") as Record<
      string,
      string
    >;
  }
  return countriesCache;
}

/** All supported holiday countries, sorted by name (for the picker). */
export function holidayCountries(): HolidayCountry[] {
  return Object.entries(countriesMap())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The holiday country implied by the user's timezone (e.g. Asia/Kolkata → IN),
 * falling back to US when the timezone maps to an unsupported country.
 */
export function countryFromTimezone(
  timeZone: string | null | undefined
): string {
  if (timeZone) {
    const country = getCountryForTimezone(timeZone);
    if (country && countriesMap()[country.id]) {
      return country.id;
    }
  }
  return "US";
}

/** Public holidays for a country in the given year (defaults to the current year). */
export function countryHolidays(code: string, year?: number): HolidayItem[] {
  if (!countriesMap()[code]) {
    return [];
  }
  const hd = new Holidays(code);
  const y = year ?? new Date().getFullYear();
  return hd
    .getHolidays(y)
    .filter((h) => h.type === "public")
    .map((h) => ({ date: String(h.date).slice(0, 10), name: h.name }));
}
