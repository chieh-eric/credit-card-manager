import { useState } from 'react'
import type { BenefitStatus } from '../lib/benefits'
import { formatRange, PERIOD_LABEL } from '../lib/periods'
import { usageKey, useStore } from '../lib/store'
import { CardArt, Progress, UrgencyChip, usd } from './ui'

const GOAL_TARGET: Record<string, number> = { 'surpass-fn': 15000 }

export function BenefitRow({ s }: { s: BenefitStatus }) {
  const { state, setState } = useStore()
  const [open, setOpen] = useState(false)
  const { benefit: b, card, window: w } = s
  const key = usageKey(b.id, w.key)
  const goal = GOAL_TARGET[b.id]

  const setUsed = (used: number, done?: boolean) =>
    setState((st) => ({
      ...st,
      usage: { ...st.usage, [key]: { used: Math.max(0, Math.min(b.amount, used)), done, updatedAt: new Date().toISOString() } },
    }))

  const toggleDone = () => (s.done ? setUsed(0, false) : setUsed(b.amount, true))
  const enrolled = state.enrolled[b.id]
  const tone = s.done ? 'emerald' : s.urgency === 'urgent' ? 'rose' : s.urgency === 'soon' ? 'amber' : 'indigo'

  return (
    <li className={`card-surface overflow-hidden transition ${s.done ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={toggleDone}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500 dark:border-slate-600'
          }`}
          aria-label={s.done ? '標記為未完成' : '標記為已用完'}
          title={s.done ? '標記為未完成' : '標記為已用完'}
        >
          {s.done && '✓'}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={`font-medium ${s.done ? 'line-through decoration-slate-400' : ''}`}>{b.name}</h3>
            {b.amount > 0 && <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{usd(b.amount)}</span>}
            <UrgencyChip s={s} />
            {b.enrollment && !enrolled && (
              <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" title="需先在 Amex App 登記">
                需登記
              </span>
            )}
            {s.autoUsed > 0 && (
              <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" title="由匯入的交易自動偵測">
                ⚡ 自動偵測 {usd(s.autoUsed)}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CardArt card={card} size="sm" />
              {card.shortName}
            </span>
            <span>·</span>
            <span>
              {PERIOD_LABEL[b.period]} {b.period !== 'once' && `(${formatRange(w, b.period === 'cardYear' || b.period === 'every4Years')})`}
              {b.period === 'once' && `截止 ${w.end.getMonth() + 1}/${w.end.getDate()}`}
            </span>
            {w.assumed && (
              <span className="text-amber-600 dark:text-amber-400" title="請到設定填寫開卡日，週年期間才會準確">
                ⚠ 未設開卡日
              </span>
            )}
          </div>

          {b.amount > 0 && !b.estimated && (
            <div className="mt-3 flex items-center gap-3">
              <Progress value={s.used} max={b.amount} tone={tone} />
              <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {usd(s.used)} / {usd(b.amount)}
              </span>
            </div>
          )}

          {goal && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-3">
                <Progress value={state.goalProgress[b.id] ?? 0} max={goal} tone={tone} />
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {usd(state.goalProgress[b.id] ?? 0)} / {usd(goal)}
                </span>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setOpen((o) => !o)} className="btn-ghost shrink-0 px-2" aria-expanded={open}>
          {open ? '收合' : '怎麼用'}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{b.howToUse}</p>
          {b.unverified && <p className="text-xs text-amber-600">⚠ 此項目未能從發卡行官網確認，請以 App 內條款為準。</p>}
          <div className="flex flex-wrap items-center gap-2">
            {b.amount > 0 && !b.estimated && (
              <label className="flex items-center gap-2 text-xs">
                已使用
                <input
                  type="number"
                  min={0}
                  max={b.amount}
                  step="0.01"
                  className="input w-24"
                  value={state.usage[key]?.used ?? ''}
                  placeholder={String(s.autoUsed || 0)}
                  onChange={(e) => setUsed(Number(e.target.value))}
                />
              </label>
            )}
            {goal && (
              <label className="flex items-center gap-2 text-xs">
                今年已消費
                <input
                  type="number"
                  min={0}
                  className="input w-28"
                  value={state.goalProgress[b.id] ?? ''}
                  onChange={(e) => setState((st) => ({ ...st, goalProgress: { ...st.goalProgress, [b.id]: Number(e.target.value) } }))}
                />
              </label>
            )}
            {b.enrollment && (
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={!!enrolled}
                  onChange={(e) => setState((st) => ({ ...st, enrolled: { ...st.enrolled, [b.id]: e.target.checked } }))}
                />
                我已登記
              </label>
            )}
          </div>
          {s.matches.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">偵測到的交易</div>
              <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                {s.matches.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {t.date} · {t.description}
                    </span>
                    <span className="tabular-nums">{usd(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
