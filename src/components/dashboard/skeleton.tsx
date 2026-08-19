import { cn } from '@/lib/utils'

/**
 * Shared skeleton primitive — a pulsing slate block sized to whatever
 * container it's dropped into. Used by every dashboard widget while
 * its data fetches.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5.5 shadow-sm',
        className,
      )}
    >
      <Skeleton className="h-4 w-32 rounded-lg" />
      <Skeleton className="mt-4 h-8 w-20 rounded-lg" />
      <Skeleton className="mt-2.5 h-3.5 w-16 rounded-md" />
    </div>
  )
}
