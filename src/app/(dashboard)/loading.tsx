/**
 * Instant feedback while a dashboard route's JS/RSC loads. Rendered inside
 * the persistent shell, so the sidebar/header never flash on navigation.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
        </div>
        <div className="hidden h-9 w-32 animate-pulse rounded-lg bg-muted sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}
