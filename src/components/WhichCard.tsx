import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_BY_ID, CURRENCY_LABEL } from '../data/categories'
import type { CategoryId } from '../data/types'
import { allStatuses } from '../lib/benefits'
import { CATEGORY_TIPS, recommend } from '../lib/recommend'
import { useStore } from '../lib/store'
import { CardArt, Section, usd } from './ui'

/** Categories where an unused credit should override the earn-rate ranking. */
const CREDIT_HINTS: Partial<Record<CategoryId, string[]>> = {
  hotelHilton: ['surpass-hilton'],
  portalHotel: ['vx-travel', 'csp-hotel'],
  portalFlight: ['vx-travel'],
  transit: ['gold-uber'],
  dining: ['gold-dining', 'gold-resy', 'gold-dunkin'],
}

export function WhichCard() {
  const { state, today } = useStore()
  const [cat, setCat] = useState<CategoryId>('dining')
  const [q, setQ] = useState('')
  const recs = useMemo(() => recommend(cat, state.ownedCards, state.cpp), [cat, state.ownedCards, state.cpp])
  const best = recs[0]
  const statuses = useMemo(() => allStatuses(state, today), [state, today])
  const openCredits = (CREDIT_HINTS[cat] ?? []).map((id) => statuses.find((s) => s.benefit.id === id)).filter((s) => s && !s.done)

  const filtered = CATEGORIES.filter((c) => !q || `${c.label}${c.hint}`.toLowerCase().includes(q.toLowerCase()))
  const groups = ['日常', '旅遊', '其他'] as const
  const max = Math.max(...recs.map((r) => r.cents), 1)

  return (
    <div className="space-y-8">
      <Section title="現在要刷哪張卡？" subtitle="選擇消費類型，依「每 $1 回饋價值」排序（點數價值可在設定調整）">
        <input className="input w-full max-w-sm" placeholder="搜尋：例如 Airbnb、CVS、Uber…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-3">
          {groups.map((g) => {
            const items = filtered.filter((c) => c.group === g)
            if (!items.length) return null
            return (
              <div key={g}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</div>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCat(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${
                        cat === c.id
                          ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-800 ring-1 ring-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                      }`}
                    >
                      <span aria-hidden>{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {best && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <div className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <CardArt card={best.card} size="lg" />
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  {CATEGORY_BY_ID[cat].emoji} {CATEGORY_BY_ID[cat].label} → 最佳選擇
                </div>
                <div className="text-2xl font-semibold">{best.card.shortName}</div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">{best.multiplier}x</span> {CURRENCY_LABEL[best.card.currency]} ≈{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{best.cents.toFixed(1)}¢ / $1</span>
                </div>
                {best.note && <div className="text-sm text-slate-500">{best.note}</div>}
              </div>
            </div>

            {openCredits.length > 0 && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="mb-1 font-semibold">💡 你還有 credit 可以用</div>
                <ul className="space-y-0.5">
                  {openCredits.map((s) => (
                    <li key={s!.benefit.id}>
                      {s!.card.shortName} {s!.benefit.name}：剩 {usd(s!.remaining)}（{s!.daysLeft} 天內到期）— 這筆先刷 {s!.card.shortName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ol className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
              {recs.map((r, i) => (
                <li key={r.card.id} className="flex items-center gap-3 p-3">
                  <span className="w-5 text-center text-sm font-semibold text-slate-400">{i + 1}</span>
                  <CardArt card={r.card} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="font-medium">{r.card.shortName}</span>
                      <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                        {r.multiplier}x · <span className="font-semibold">{r.cents.toFixed(1)}¢</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${Math.max(0, (r.cents / max) * 100)}%` }} />
                    </div>
                    {(r.note || r.warning) && (
                      <div className="mt-1 text-xs text-slate-500">
                        {r.warning && <span className="mr-2 font-medium text-rose-600">⚠ {r.warning}</span>}
                        {r.note}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="space-y-3">
            <h3 className="text-sm font-semibold">小提醒</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {(CATEGORY_TIPS[cat] ?? ['照排名刷就對了。']).map((t) => (
                <li key={t} className="card-surface p-3 leading-relaxed">
                  {t}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      <CheatSheet />
    </div>
  )
}

function CheatSheet() {
  const { state } = useStore()
  return (
    <Section title="刷卡速查表" subtitle="每個類別的第一、第二選擇 — 可以截圖存在手機">
      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 font-semibold">類別</th>
              <th className="px-3 py-2 font-semibold">首選</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">次選</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {CATEGORIES.map((c) => {
              const [a, b] = recommend(c.id, state.ownedCards, state.cpp)
              return (
                <tr key={c.id}>
                  <td className="whitespace-nowrap px-3 py-2">
                    {c.emoji} {c.label}
                  </td>
                  <td className="px-3 py-2">
                    {a && (
                      <span className="inline-flex items-center gap-2">
                        <CardArt card={a.card} size="sm" />
                        <span className="font-medium">{a.card.shortName}</span>
                        <span className="text-xs text-slate-500">
                          {a.multiplier}x · {a.cents.toFixed(1)}¢
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {b && (
                      <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CardArt card={b.card} size="sm" />
                        {b.card.shortName}
                        <span className="text-xs">
                          {b.multiplier}x · {b.cents.toFixed(1)}¢
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
