import type { ReactNode } from 'react'
import type { Card } from '../data/types'
import type { BenefitStatus } from '../lib/benefits'

export const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 })

export function CardArt({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-6 w-9 rounded' : size === 'md' ? 'h-10 w-16 rounded-md' : 'h-28 w-44 rounded-xl p-3'
  return (
    <div
      className={`${dims} relative shrink-0 overflow-hidden shadow-sm ring-1 ring-black/10`}
      style={{ background: `linear-gradient(135deg, ${card.color[0]}, ${card.color[1]})` }}
      aria-hidden={size !== 'lg'}
    >
      {size === 'lg' ? (
        <div className="flex h-full flex-col justify-between text-white">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{card.issuer}</div>
          <div className="h-5 w-7 rounded-sm bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90" />
          <div className="text-sm font-semibold leading-tight drop-shadow">{card.shortName}</div>
        </div>
      ) : (
        <div className="absolute bottom-1 left-1 h-1.5 w-2.5 rounded-[2px] bg-yellow-300/80" />
      )}
    </div>
  )
}

export function Progress({ value, max, tone = 'indigo' }: { value: number; max: number; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' }[tone]
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function UrgencyChip({ s }: { s: BenefitStatus }) {
  if (s.urgency === 'done') return <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">✓ 已完成</span>
  if (s.urgency === 'overdue') return <span className="chip bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">已過期</span>
  const cls =
    s.urgency === 'urgent'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
      : s.urgency === 'soon'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  const label = s.daysLeft === 0 ? '今天到期' : `剩 ${s.daysLeft} 天`
  return <span className={`chip ${cls}`}>{label}</span>
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'rose' | 'emerald' }) {
  const color = tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''
  return (
    <div className="card-surface p-4">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  )
}
