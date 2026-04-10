/**
 * Finance page skeleton screen — shown instantly on slow 3G connections
 * while the server fetches ledger data. CSS-only, zero JS, zero layout shift.
 */
export default function FinanceLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-[var(--line)]" />
          <div className="h-9 w-40 rounded-lg bg-[var(--line)]" />
          <div className="h-4 w-80 rounded bg-[var(--line)]" />
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Donut skeleton */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="mb-4 space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-[var(--line)]" />
            <div className="h-4 w-32 rounded bg-[var(--line)]" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-40 w-40 rounded-full border-[20px] border-[var(--line)]" />
            <div className="w-full space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
                    <div className="h-3 w-24 rounded bg-[var(--line)]" />
                  </div>
                  <div className="h-3 w-8 rounded bg-[var(--line)]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Histogram skeleton */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 lg:col-span-2">
          <div className="mb-4 space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-[var(--line)]" />
            <div className="h-4 w-48 rounded bg-[var(--line)]" />
          </div>
          <div className="flex items-end gap-1 h-36">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t bg-[var(--line)]"
                  style={{ height: `${30 + Math.sin(i) * 25 + Math.random() * 30}px` }}
                />
                <div className="h-2 w-5 rounded bg-[var(--line)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric strip skeleton */}
      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--line)]" />
            <div className="h-8 w-12 rounded-lg bg-[var(--line)]" />
            <div className="h-3 w-32 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 rounded-full bg-[var(--line)]" />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-28 rounded bg-[var(--line)]" />
            <div className="h-4 flex-1 rounded bg-[var(--line)]" />
            <div className="h-4 w-20 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
