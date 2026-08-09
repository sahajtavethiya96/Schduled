const tabSkeletons = ["tab-1", "tab-2", "tab-3", "tab-4"];
const bookingRows = ["row-1", "row-2", "row-3", "row-4", "row-5", "row-6"];

export default function BookingsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="h-7 w-28 bg-base-200" />

      {/* Tab pills (4 tabs) + date filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {tabSkeletons.map((tab) => (
            <div className="h-8 w-20 bg-base-200" key={tab} />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-9 w-[150px] bg-base-200" />
          <div className="h-9 w-[150px] bg-base-200" />
          <div className="h-9 w-44 bg-base-200" />
        </div>
      </div>

      {/* Booking rows */}
      <div className="space-y-2">
        {bookingRows.map((row) => (
          <div
            className="flex items-stretch border border-base-300 overflow-hidden"
            key={row}
          >
            <div className="w-[3px] bg-base-200 shrink-0" />
            <div className="w-14 shrink-0 bg-base-200/30 flex flex-col items-center justify-center gap-1 py-4">
              <div className="h-3 w-8 bg-base-200" />
              <div className="h-5 w-6 bg-base-200" />
            </div>
            <div className="flex-1 px-4 py-3 space-y-1.5">
              <div className="h-4 w-40 bg-base-200" />
              <div className="h-3 w-28 bg-base-200" />
              <div className="h-3 w-20 bg-base-200" />
            </div>
            <div className="shrink-0 px-3 py-3 flex flex-col gap-1.5 justify-center items-end">
              <div className="h-5 w-16 bg-base-200" />
              <div className="h-7 w-24 bg-base-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
