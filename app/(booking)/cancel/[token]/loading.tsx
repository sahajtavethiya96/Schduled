export default function CancelLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200/30 p-4">
      <div className="w-full max-w-md overflow-hidden bg-base-100 border border-base-300 animate-pulse">
        <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/20 px-6 py-6">
          <div className="h-6 w-6 bg-base-200" />
          <div className="h-5 w-36 bg-base-200" />
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="border border-base-300 bg-base-200/20 p-4 space-y-2">
            <div className="h-4 w-40 bg-base-200" />
            <div className="h-3 w-24 bg-base-200" />
            <div className="h-3 w-32 bg-base-200" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-20 bg-base-200" />
            <div className="h-20 w-full bg-base-200" />
          </div>
          <div className="h-11 w-full bg-base-200" />
        </div>
      </div>
    </main>
  );
}
