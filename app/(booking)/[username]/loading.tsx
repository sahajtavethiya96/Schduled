export default function HostProfileLoading() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      {/* Avatar skeleton */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="h-[72px] w-[72px] rounded-full bg-base-200 animate-pulse" />
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-5 w-32 rounded bg-base-200 animate-pulse" />
          <div className="h-3.5 w-24 rounded bg-base-200/60 animate-pulse" />
        </div>
      </div>

      {/* Event type card skeletons */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border border-base-300 bg-base-100 p-5">
            <div className="h-12 w-1 shrink-0 bg-base-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-base-200 animate-pulse" />
              <div className="h-3 w-56 rounded bg-base-200/60 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-3 w-14 rounded bg-base-200/50 animate-pulse" />
                <div className="h-3 w-16 rounded bg-base-200/50 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
