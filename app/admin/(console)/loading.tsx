/** Skeleton shown while a console route's data loads (App Router loading.tsx). */
export default function ConsoleLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="h-9 w-56 rounded bg-border-warm/70" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-card border border-border-warm bg-paper" />
        ))}
      </div>
      <div className="overflow-hidden rounded-card border border-border-warm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border-warm/60 bg-paper px-4 py-3.5 last:border-0">
            <div className="h-4 w-40 rounded bg-border-warm/60" />
            <div className="ml-auto h-4 w-20 rounded bg-border-warm/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
