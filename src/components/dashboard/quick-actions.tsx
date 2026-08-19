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
}

const ACTIONS: Action[] = [
  {
    labelKey: 'newContact',
    href: '/contacts',
    icon: UserPlus,
    iconStyle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white',
    hoverGlow: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
  },
  {
    labelKey: 'newDeal',
    href: '/pipelines',
    icon: Briefcase,
    iconStyle: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white',
    hoverGlow: 'hover:border-blue-500/40 hover:shadow-blue-500/10',
  },
  {
    labelKey: 'newBroadcast',
    href: '/broadcasts/new',
    icon: Radio,
    iconStyle: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-white',
    hoverGlow: 'hover:border-cyan-500/40 hover:shadow-cyan-500/10',
  },
  {
    labelKey: 'newAutomation',
    href: '/automations/new',
    icon: Zap,
    iconStyle: 'bg-teal-500/15 text-teal-400 border border-teal-500/30 group-hover:bg-teal-500 group-hover:text-white',
    hoverGlow: 'hover:border-teal-500/40 hover:shadow-teal-500/10',
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
              "group flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-card-2",
              a.hoverGlow,
            )}
          >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200', a.iconStyle)}>
              <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{t(a.labelKey as string)}</span>
          </Link>
        )
      })}
    </div>
  )
}
