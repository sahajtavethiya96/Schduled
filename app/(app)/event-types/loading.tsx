const cardRows = ['c1', 'c2', 'c3']

export default function EventTypesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-base-200" />
        <div className="h-9 w-32 bg-base-200" />
      </div>

      {/* Event type cards */}
      <div className="space-y-3">
        {cardRows.map((row) => (
          <div
            key={row}
            className="flex items-stretch border border-base-300 overflow-hidden"
          >
            <div className="w-1 bg-base-200 shrink-0" />
            <div className="flex flex-1 items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-base-200" />
                <div className="h-3 w-64 bg-base-200" />
                <div className="flex gap-2 mt-1">
                  <div className="h-4 w-16 bg-base-200" />
                  <div className="h-4 w-20 bg-base-200" />
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="h-8 w-8 bg-base-200" />
                <div className="h-8 w-8 bg-base-200" />
                <div className="h-8 w-8 bg-base-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
