export default function MemberSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[1.1rem] border border-line bg-canvas px-4 py-3"
        >
          <div className="skeleton skeleton-avatar h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-line h-3 w-2/5 rounded-full" />
            <div className="skeleton skeleton-line h-2.5 w-1/3 rounded-full opacity-70" />
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="skeleton skeleton-line h-5 w-14 rounded-full" />
            <div className="skeleton skeleton-line h-5 w-14 rounded-full opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemberCardSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card rounded-[1.4rem] border border-line bg-canvas p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="skeleton skeleton-avatar h-11 w-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton skeleton-line h-3.5 w-3/5 rounded-full" />
              <div className="skeleton skeleton-line h-2.5 w-2/5 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="skeleton skeleton-line h-2.5 w-full rounded-full" />
            <div className="skeleton skeleton-line h-2.5 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
