import { useState } from 'react'
import { CARDS } from '../data/cards'
import { CATEGORY_BY_ID, CURRENCY_LABEL } from '../data/categories'
import type { Card } from '../data/types'
import { cardYearValue } from '../lib/benefits'
import { PERIOD_LABEL, PERIODS_PER_YEAR } from '../lib/periods'
import { useStore } from '../lib/store'
import { CardArt, Progress, usd } from './ui'

export function CardsView() {
  const { state } = useStore()
  const owned = CARDS.filter((c) => state.ownedCards.includes(c.id))
  const [sel, setSel] = useState(owned[0]?.id)
  const card = owned.find((c) => c.id === sel) ?? owned[0]
  if (!card) return <p className="text-slate-500">請到設定選擇你持有的卡。</p>

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="卡片">
        {owned.map((c) => (
          <button
            key={c.id}
            onClick={() => setSel(c.id)}
            aria-current={c.id === card.id}
            className={`flex shrink-0 items-center gap-3 rounded-xl border p-2.5 text-left transition ${
              c.id === card.id
                ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 dark:bg-slate-900'
                : 'border-transparent hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <CardArt card={c} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{c.shortName}</div>
              <div className="text-xs text-slate-500">{c.annualFee ? `${usd(c.annualFee)}/年` : '免年費'}</div>
            </div>
          </button>
        ))}
      </nav>
      <CardDetail card={card} />
    </div>
  )
}

function CardDetail({ card }: { card: Card }) {
  const { state, today } = useStore()
  const roi = cardYearValue(card, state, today)
  const annualCredits = card.benefits.reduce((s, b) => s + b.amount * PERIODS_PER_YEAR[b.period], 0)

  return (
    <article className="min-w-0 space-y-6">
      <header className="card-surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <CardArt card={card} size="lg" />
        <div className="flex-1 space-y-2">
          <h2 className="text-xl font-semibold">{card.name}</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip bg-slate-100 dark:bg-slate-800">{card.issuer}</span>
            <span className="chip bg-slate-100 dark:bg-slate-800">{card.network}</span>
            <span className="chip bg-slate-100 dark:bg-slate-800">{CURRENCY_LABEL[card.currency]}</span>
            <span className={`chip ${card.foreignTxFee ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
              {card.foreignTxFee ? '有 3% 海外手續費' : '免海外手續費'}
            </span>
          </div>
          <dl className="grid grid-cols-3 gap-3 pt-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">年費</dt>
              <dd className="text-lg font-semibold">{card.annualFee ? usd(card.annualFee) : '$0'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">每年 credits</dt>
              <dd className="text-lg font-semibold">{annualCredits ? usd(annualCredits) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">本卡年已回收</dt>
              <dd className={`text-lg font-semibold ${roi.captured >= card.annualFee ? 'text-emerald-600' : ''}`}>{usd(roi.captured)}</dd>
            </div>
          </dl>
          {card.annualFee > 0 && roi.potential > 0 && (
            <div className="space-y-1 pt-1">
              <Progress value={roi.captured} max={card.annualFee} tone={roi.captured >= card.annualFee ? 'emerald' : 'amber'} />
              <div className="text-xs text-slate-500">
                {roi.captured >= card.annualFee ? '✓ 已回本年費' : `還差 ${usd(card.annualFee - roi.captured)} 回本`}（不含點數回饋）
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Block title="💰 回饋倍率">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...card.earn]
                .filter((e) => e.category !== 'diningAbroad')
                .sort((a, b) => b.multiplier - a.multiplier)
                .map((e) => (
                  <tr key={e.category}>
                    <td className="w-14 py-2 pr-2 text-lg font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">{e.multiplier}x</td>
                    <td className="py-2">
                      <div>
                        {CATEGORY_BY_ID[e.category].emoji} {e.category === 'other' ? '其他所有消費' : CATEGORY_BY_ID[e.category].label}
                      </div>
                      {e.note && <div className="text-xs text-slate-500">{e.note}</div>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Block>

        <Block title="🎟️ Credits（要主動花掉的）">
          {card.benefits.length === 0 ? (
            <p className="text-sm text-slate-500">這張卡沒有需要追蹤的 credit。</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {card.benefits.map((b) => (
                <li key={b.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{b.name}</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      {b.amount ? `${usd(b.amount)} ${PERIOD_LABEL[b.period]}` : PERIOD_LABEL[b.period]}
                      {b.enrollment && <span className="ml-1 chip bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">需登記</span>}
                    </span>
                  </div>
                  <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">{b.howToUse}</p>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="✨ 其他權益">
          <List items={card.perks} />
        </Block>
        <Block title="🛡️ 保險 / 保障">
          <List items={card.protections} />
        </Block>
      </div>

      <Block title="📝 使用策略與注意事項">
        <List items={card.notes} />
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
          資料最後確認：{card.lastVerified} · 來源：
          {card.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && '、'}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                {s.label}
              </a>
            </span>
          ))}
        </div>
      </Block>
    </article>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 marker:text-slate-300 dark:text-slate-300">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}
