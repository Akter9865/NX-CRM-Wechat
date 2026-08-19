import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string
  icon: ComponentType<{ className?: string }>
  accent?: 'emerald' | 'blue' | 'cyan' | 'teal'
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

const ACCENT_STYLES = {
  emerald: {
    iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    topBar: 'from-emerald-500/80 via-emerald-400 to-teal-500',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  blue: {
    iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    topBar: 'from-blue-500/80 via-indigo-400 to-cyan-500',
    hoverBorder: 'hover:border-blue-500/40',
  },
  cyan: {
    iconBg: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    topBar: 'from-cyan-500/80 via-sky-400 to-blue-500',
    hoverBorder: 'hover:border-cyan-500/40',
  },
  teal: {
    iconBg: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
    topBar: 'from-teal-500/80 via-emerald-400 to-cyan-500',
    hoverBorder: 'hover:border-teal-500/40',
  },
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  accent = 'emerald',
  delta,
  subtitle,
}: MetricCardProps) {
  const style = ACCENT_STYLES[accent] ?? ACCENT_STYLES.emerald

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5',
        style.hoverBorder,
      )}
    >
      {/* Top accent gradient bar */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-60 transition-opacity duration-200 group-hover:opacity-100',
          style.topBar,
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
            style.iconBg,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {delta ? (
        <DeltaRow sign={delta.sign} label={delta.label} />
      ) : subtitle ? (
        <p className="mt-2 text-xs font-medium text-muted-foreground">{subtitle}</p>
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
        'mt-2.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
        isPositive
          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : isNegative
          ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
          : 'border border-border bg-muted/60 text-muted-foreground',
      )}
    >
      <Arrow className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
