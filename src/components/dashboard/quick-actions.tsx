"use client"

import Link from 'next/link'
import { UserPlus, Briefcase, Radio, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
interface Action {
  labelKey: string
  href: string
  icon: ComponentType<{ className?: string }>
  iconStyle: string
  hoverGlow: string
  badgeText: string
  badgeColor: string
}

const ACTIONS: Action[] = [
  {
    labelKey: 'newContact',
    href: '/contacts',
    icon: UserPlus,
    iconStyle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white shadow-sm shadow-emerald-500/10',
    hoverGlow: 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 hover:bg-emerald-500/[0.02]',
    badgeText: 'CRM',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    labelKey: 'newDeal',
    href: '/pipelines',
    icon: Briefcase,
    iconStyle: 'bg-purple-500/15 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white shadow-sm shadow-purple-500/10',
    hoverGlow: 'hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 hover:bg-purple-500/[0.02]',
    badgeText: 'Sales',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    labelKey: 'newBroadcast',
    href: '/broadcasts/new',
    icon: Radio,
    iconStyle: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-white shadow-sm shadow-cyan-500/10',
    hoverGlow: 'hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 hover:bg-cyan-500/[0.02]',
    badgeText: 'Campaign',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    labelKey: 'newAutomation',
    href: '/automations/new',
    icon: Zap,
    iconStyle: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white shadow-sm shadow-amber-500/10',
    hoverGlow: 'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 hover:bg-amber-500/[0.02]',
    badgeText: 'Bot Flow',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
]

export function QuickActions() {
  const t = useTranslations('Dashboard.quickActions')
  
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              "group relative flex items-center justify-between rounded-2xl border border-border/80 bg-card/80 backdrop-blur p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
              a.hoverGlow,
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300', a.iconStyle)}>
                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                {t(a.labelKey as string)}
              </span>
            </div>
            <span className={cn('hidden xl:inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', a.badgeColor)}>
              {a.badgeText}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
