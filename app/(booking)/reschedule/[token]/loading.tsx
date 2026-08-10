export default function RescheduleLoading() {
  return (
    <div className="relative min-h-screen bg-base-200/30 p-4 md:p-6 lg:flex lg:h-screen lg:items-center lg:p-8 animate-pulse">
      <div className="mx-auto w-full max-w-[900px] bg-base-100 border border-base-300 lg:flex lg:max-h-[640px]">
        <div className="flex flex-col lg:flex-row flex-1">
          {/* Left info panel */}
          <div className="lg:w-[230px] border-b lg:border-b-0 lg:border-r border-base-300 p-6 space-y-4">
            <div className="h-10 w-10 bg-base-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-base-200" />
              <div className="h-3 w-32 bg-base-200" />
            </div>
            <div className="h-px bg-base-200" />
            <div className="h-5 w-36 bg-base-200" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-base-200" />
              <div className="h-3 w-28 bg-base-200" />
            </div>
          </div>

          {/* Calendar panel */}
          <div className="lg:w-[320px] border-b lg:border-b-0 lg:border-r border-base-300 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 bg-base-200" />
              <div className="h-4 w-28 bg-base-200" />
              <div className="h-9 w-9 bg-base-200" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div className="aspect-square bg-base-200" key={i} />
              ))}
            </div>
          </div>

          {/* Slots panel */}
          <div className="flex-1 p-6 space-y-3">
            <div className="h-4 w-24 bg-base-200" />
            <div className="h-5 w-36 bg-base-200" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="h-11 w-full bg-base-200" key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
