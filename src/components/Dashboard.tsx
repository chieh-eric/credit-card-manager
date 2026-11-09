import { useMemo, useState } from 'react'
import { CARDS } from '../data/cards'
import { allStatuses, cardYearValue, upcomingFees, type BenefitStatus } from '../lib/benefits'
import { buildIcs, downloadText } from '../lib/ics'
import { notificationsSupported, requestAndNotify } from '../lib/notify'
import { PERIOD_LABEL, PERIODS_PER_YEAR } from '../lib/periods'
import { useStore } from '../lib/store'
import { BenefitRow } from './BenefitRow'
import { CardArt, Section, Stat, usd } from './ui'

type Filter = 'all' | string

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const { state, today } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [showDone, setShowDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const statuses = useMemo(() => allStatuses(state, today), [state, today])
  const visible = statuses.filter((s) => filter === 'all' || s.card.id === filter)
  const open = visible.filter((s) => !s.done && s.urgency !== 'overdue').sort((a, b) => a.daysLeft - b.daysLeft || b.remaining - a.remaining)
  const done = visible.filter((s) => s.done)

  const groups: { title: string; items: BenefitStatus[] }[] = [
    { title: `🔥 ${state.reminderDays} 天內到期`, items: open.filter((s) => s.daysLeft <= state.reminderDays) },
    { title: '📅 本月內', items: open.filter((s) => s.daysLeft > state.reminderDays && s.daysLeft <= 31) },
    { title: '🗓️ 之後', items: open.filter((s) => s.daysLeft > 31) },
  ]

  const remainingNow = open.filter((s) => s.daysLeft <= 31).reduce((sum, s) => sum + s.remaining, 0)
  const urgentCount = groups[0].items.length
  const owned = CARDS.filter((c) => state.ownedCards.includes(c.id))
  const totalFees = owned.reduce((s, c) => s + c.annualFee, 0)
  const captured = owned.reduce((s, c) => s + cardYearValue(c, state, today).captured, 0)
  const fees = upcomingFees(state, today).filter((f) => f.daysLeft <= 60)
  const missingOpen = owned.filter((c) => (c.annualFee > 0 || c.benefits.some((b) => b.period === 'cardYear')) && !state.openDates[c.id])

  const exportIcs = () => {
    downloadText('card-benefits.ics', buildIcs(state, today), 'text/calendar')
    setMsg('已下載 .ics — 用 Google Calendar / Apple 行事曆匯入，每個到期日前會提醒你。')
  }
  const notify = async () => {
    const r = await requestAndNotify(statuses, state.reminderDays)
    setMsg(r)
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="本月還沒用的 credits" value={usd(remainingNow)} sub="31 天內到期" tone={remainingNow > 0 ? 'rose' : 'emerald'} />
        <Stat label={`${state.reminderDays} 天內到期`} value={`${urgentCount} 項`} sub="優先處理" tone={urgentCount ? 'rose' : 'emerald'} />
        <Stat label="本卡年已回收" value={usd(captured)} sub="各卡週年年度合計" />
        <Stat label="年費總計" value={usd(totalFees)} sub={`${owned.length} 張卡`} />
      </div>

      {missingOpen.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <span>
            填寫開卡日後，週年 credit（{missingOpen.map((c) => c.shortName).join('、')}）與年費提醒才會準確。
          </span>
          <button className="btn-primary" onClick={() => go('settings')}>
            去設定
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section
            title="該做的事"
            subtitle="依到期日排序；勾選代表已用完，或點「怎麼用」輸入部分金額"
            action={
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={exportIcs}>
                  📆 加入行事曆
                </button>
                {notificationsSupported() && (
                  <button className="btn-ghost" onClick={notify}>
                    🔔 通知我
                  </button>
                )}
              </div>
            }
          >
            {msg && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">{msg}</p>}

            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="依卡片篩選">
              <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
                全部
              </FilterPill>
              {owned
                .filter((c) => c.benefits.length)
                .map((c) => (
                  <FilterPill key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                    <CardArt card={c} size="sm" />
                    {c.shortName}
                  </FilterPill>
                ))}
            </div>

            {groups.map(
              (g) =>
                g.items.length > 0 && (
                  <div key={g.title} className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {g.title} <span className="font-normal text-slate-400">({g.items.length})</span>
                    </h3>
                    <ul className="space-y-2">
                      {g.items.map((s) => (
                        <BenefitRow key={s.benefit.id} s={s} />
                      ))}
                    </ul>
                  </div>
                ),
            )}
            {open.length === 0 && <p className="card-surface p-6 text-center text-slate-500">🎉 全部都用完了！</p>}

            {done.length > 0 && (
              <div className="space-y-2">
                <button className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" onClick={() => setShowDone((v) => !v)}>
                  {showDone ? '▾' : '▸'} 本期已完成 ({done.length})
                </button>
                {showDone && (
                  <ul className="space-y-2">
                    {done.map((s) => (
                      <BenefitRow key={s.benefit.id} s={s} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="例行節奏" subtitle="一年能拿回的 credits">
            <Rhythm />
          </Section>

          <Section title="年費提醒" subtitle="60 天內入帳">
            {fees.length === 0 ? (
              <p className="text-sm text-slate-500">{Object.keys(state.openDates).length ? '近 60 天沒有年費。' : '設定開卡日後顯示。'}</p>
            ) : (
              <ul className="space-y-2">
                {fees.map((f) => (
                  <li key={f.card.id} className="card-surface flex items-center gap-3 p-3">
                    <CardArt card={f.card} />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">{f.card.shortName}</div>
                      <div className="text-xs text-slate-500">
                        {f.date.getMonth() + 1}/{f.date.getDate()} · 剩 {f.daysLeft} 天
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{usd(f.card.annualFee)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <button className="btn-primary w-full py-2.5" onClick={() => go('which')}>
            💳 現在要買東西？看刷哪張卡 →
          </button>
        </aside>
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function Rhythm() {
  const { state } = useStore()
  const order = ['monthly', 'quarterly', 'semiannual', 'annual', 'cardYear'] as const
  const owned = CARDS.filter((c) => state.ownedCards.includes(c.id))
  const rows = order
    .map((p) => ({ p, items: owned.flatMap((c) => c.benefits.filter((b) => b.period === p).map((b) => ({ b, c }))) }))
    .filter((r) => r.items.length)
  return (
    <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map(({ p, items }) => (
        <div key={p} className="p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{PERIOD_LABEL[p]}</div>
          <ul className="space-y-1 text-sm">
            {items.map(({ b, c }) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <CardArt card={c} size="sm" />
                  <span className="truncate">{b.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {b.amount ? `${usd(b.amount)}${p !== 'annual' && p !== 'cardYear' ? ` → ${usd(b.amount * PERIODS_PER_YEAR[p])}/年` : ''}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
