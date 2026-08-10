// Turbopack dev-mode bug (Next.js 16): performance.measure() throws when an
// internal 'NotFound' component mark has a negative timestamp. Swallow those
// errors in development so they don't pollute the console.
if (
  process.env.NODE_ENV === "development" &&
  typeof performance !== "undefined"
) {
  const _measure = performance.measure.bind(performance);
  // @ts-expect-error
  performance.measure = (...args: Parameters<typeof performance.measure>) => {
    try {
      return _measure(...args);
    } catch {
      // swallow negative-timestamp errors from Turbopack's component profiling
    }
  };
}
