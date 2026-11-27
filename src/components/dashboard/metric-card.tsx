import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string
  icon: ComponentType<{ className?: string }>
  accent?: 'emerald' | 'blue' | 'cyan' | 'teal' | 'purple' | 'amber'
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string
  }
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string
}

const ACCENT_STYLES: Record<NonNullable<MetricCardProps['accent']>, string> = {
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  blue: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  cyan: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
  teal: 'bg-teal-500/12 text-teal-600 dark:text-teal-400',
  purple: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  accent = 'emerald',
  delta,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="surface surface-hover flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        <div className={cn('flex size-9 items-center justify-center rounded-xl', ACCENT_STYLES[accent] ?? ACCENT_STYLES.emerald)}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-[28px]">
        {value}
      </p>
      {delta ? (
        <DeltaRow sign={delta.sign} label={delta.label} />
      ) : subtitle ? (
        <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const isPositive = sign > 0
  const isNegative = sign < 0
  const Arrow = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus

  return (
    <div
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        isPositive
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : isNegative
          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <Arrow className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
