import {
  getAvailabilityData,
  getMeetingLimits,
} from "@/app/actions/availability";
import { PageHeader } from "@/components/scaffold/page-header";
import {
  countryFromTimezone,
  countryHolidays,
  holidayCountries,
} from "@/lib/holidays";
import { AvailabilityForm } from "./_components/availability-form";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const [{ schedules, overrides, userTimezone }, initialLimits] =
    await Promise.all([getAvailabilityData(), getMeetingLimits()]);

  // Holiday picker: default to the country from the user's timezone (e.g.
  // Asia/Kolkata → India) and prime it with that country's public holidays.
  const defaultHolidayCountry = countryFromTimezone(userTimezone);
  const holidayCountryList = holidayCountries();
  const initialHolidays = countryHolidays(defaultHolidayCountry);

  return (
    <>
      <PageHeader
        description="Set the hours you're available for meetings each week."
        eyebrow="Scheduling"
        title="Availability"
      />
      <AvailabilityForm
        defaultHolidayCountry={defaultHolidayCountry}
        holidayCountryList={holidayCountryList}
        initialHolidays={initialHolidays}
        initialMeetingLimits={initialLimits}
        initialOverrides={overrides}
        initialSchedules={schedules}
        userTimezone={userTimezone}
      />
    </>
  );
}
