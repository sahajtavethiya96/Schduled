import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { countryHolidays } from "@/lib/holidays";

// Computed server-side since date-holidays is too large to ship to the client.
export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get("country") ?? "US").toUpperCase();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  return NextResponse.json({ holidays: countryHolidays(country, year) });
}
