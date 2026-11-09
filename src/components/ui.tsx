import { useState, type ReactNode } from 'react'
import type { Card } from '../data/types'
import type { BenefitStatus } from '../lib/benefits'

export const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 })

function Chip({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 30" className={className} aria-hidden>
      <defs>
        <linearGradient id="chipg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a1" />
          <stop offset="0.5" stopColor="#d2ad57" />
          <stop offset="1" stopColor="#a7802f" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="5" fill="url(#chipg)" stroke="#8b6a26" strokeWidth="0.8" />
      <path d="M0 10h13M0 20h13M27 10h13M27 20h13M13 0v30M27 0v30M13 15h14" stroke="#8b6a26" strokeWidth="0.9" fill="none" opacity="0.75" />
    </svg>
  )
}

function Contactless({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path d="M12 6a8.5 8.5 0 0 1 0 12" />
      <path d="M15.5 3.5a12 12 0 0 1 0 17" />
    </svg>
  )
}

/** A credit card face drawn in CSS (aspect ratio of an ISO ID-1 card). */
export function CardArt({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const [a, b, c] = card.color
  const ink = card.ink === 'dark' ? 'text-[#3b2a08]' : 'text-white'
  const width = size === 'sm' ? 'w-9' : size === 'md' ? 'w-16' : 'w-64 max-w-full'
  const radius = size === 'sm' ? 'rounded-[3px]' : size === 'md' ? 'rounded-[5px]' : 'rounded-2xl'
  const sheen =
    card.finish === 'metal'
      ? `repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0.04) 1px 3px),`
      : ''
  return (
    <div
      className={`${width} ${radius} ${ink} relative shrink-0 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/10`}
      style={{
        aspectRatio: '85.6 / 54',
        background: `${sheen} radial-gradient(120% 90% at 85% -10%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(135deg, ${a} 0%, ${b} 55%, ${c} 100%)`,
      }}
      role={size === 'lg' ? 'img' : undefined}
      aria-label={size === 'lg' ? card.name : undefined}
      aria-hidden={size === 'lg' ? undefined : true}
    >
      {size === 'lg' ? (
        <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90">{card.issuer}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{card.finish === 'metal' ? 'Metal' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Chip className="h-7 w-9 drop-shadow-sm" />
            <Contactless className="h-5 w-5 opacity-80" />
          </div>
          <div className="font-mono text-[13px] tracking-[0.18em] opacity-80 [text-shadow:0_1px_0_rgba(0,0,0,0.25)]">•••• •••• •••• ••••</div>
          <div className="flex items-end justify-between gap-2">
            <span className="text-sm font-semibold leading-tight [text-shadow:0_1px_1px_rgba(0,0,0,0.2)]">{card.shortName}</span>
            <span className="text-[13px] font-bold italic tracking-wide opacity-90">{card.network.toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <Chip className={`absolute ${size === 'sm' ? 'left-[12%] top-[30%] h-[34%]' : 'left-[11%] top-[32%] h-[30%]'} w-auto`} />
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

/** Two-step inline confirmation (browser confirm() is blocked inside claude.ai). */
export function ConfirmButton({ label, confirmLabel, onConfirm, className = 'btn-ghost' }: { label: string; confirmLabel: string; onConfirm: () => void; className?: string }) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-2 py-1 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
      {confirmLabel}
      <button
        className="btn bg-rose-600 text-white hover:bg-rose-500"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        確定
      </button>
      <button className="btn-ghost" onClick={() => setAsking(false)}>
        取消
      </button>
    </span>
  )
}
