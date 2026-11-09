import { CARDS } from '../data/cards'
import { CURRENCY_LABEL, DEFAULT_CPP } from '../data/categories'
import type { Currency } from '../data/types'
import { useState } from 'react'
import { saveTextFile } from '../lib/platform'
import { defaultState, useStore, type AppState } from '../lib/store'
import { CardArt, ConfirmButton, Section } from './ui'

export function SettingsView() {
  const { state, setState } = useStore()
  const [msg, setMsg] = useState<string | null>(null)

  const toggleOwned = (id: string, on: boolean) =>
    setState((s) => ({ ...s, ownedCards: on ? [...new Set([...s.ownedCards, id])] : s.ownedCards.filter((c) => c !== id) }))

  const importBackup = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Partial<AppState>
      if (data.version !== 1) throw new Error()
      setState(() => ({ ...defaultState(), ...data }))
      setMsg('已還原備份。')
    } catch {
      setMsg('這不是有效的備份檔，請選擇之前匯出的 .json 檔。')
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <Section title="我的卡片與開卡日" subtitle="開卡日用來計算「週年」credit（Venture X $300、Sapphire $100、Marriott Free Night）與年費日期">
        <ul className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
          {CARDS.map((c) => {
            const owned = state.ownedCards.includes(c.id)
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input type="checkbox" checked={owned} onChange={(e) => toggleOwned(c.id, e.target.checked)} />
                  <CardArt card={c} />
                  <span className="truncate text-sm font-medium">{c.shortName}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  開卡日
                  <input
                    type="date"
                    className="input"
                    disabled={!owned}
                    value={state.openDates[c.id] ?? ''}
                    onChange={(e) =>
                      setState((s) => {
                        const openDates = { ...s.openDates }
                        if (e.target.value) openDates[c.id] = e.target.value
                        else delete openDates[c.id]
                        return { ...s, openDates }
                      })
                    }
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="提醒" subtitle="多早開始提醒即將到期的 credit">
        <label className="card-surface flex items-center justify-between gap-3 p-4 text-sm">
          到期前幾天提醒
          <input
            type="number"
            min={1}
            max={60}
            className="input w-20"
            value={state.reminderDays}
            onChange={(e) => setState((s) => ({ ...s, reminderDays: Math.max(1, Number(e.target.value) || 7) }))}
          />
        </label>
      </Section>

      <Section
        title="點數價值（¢ / 點）"
        subtitle="用來比較不同卡的回饋。預設值是常見的保守估計，可以依你的兌換習慣調整"
        action={
          <button className="btn-ghost" onClick={() => setState((s) => ({ ...s, cpp: { ...DEFAULT_CPP } }))}>
            重設
          </button>
        }
      >
        <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
          {(Object.keys(CURRENCY_LABEL) as Currency[]).map((cur) => (
            <label key={cur} className="flex items-center justify-between gap-3 p-3 text-sm">
              {CURRENCY_LABEL[cur]}
              <input
                type="number"
                step="0.05"
                min={0}
                className="input w-24"
                value={state.cpp[cur]}
                onChange={(e) => setState((s) => ({ ...s, cpp: { ...s.cpp, [cur]: Number(e.target.value) } }))}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="資料備份" subtitle="在 claude.ai 開啟時，資料會自動同步到你的 Claude 帳號（只有你看得到）；其他地方開啟時只存在這個瀏覽器">
        {msg && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">{msg}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            onClick={async () => setMsg((await saveTextFile(`card-benefits-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json')).message)}
          >
            ⬇ 匯出備份
          </button>
          <label className="btn-ghost cursor-pointer">
            ⬆ 匯入備份
            <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
          </label>
          <ConfirmButton
            label="清除所有資料"
            confirmLabel="清除所有勾選紀錄、開卡日與交易？"
            className="btn-ghost text-rose-600"
            onConfirm={() => {
              setState(() => defaultState())
              setMsg('已清除所有資料。')
            }}
          />
        </div>
      </Section>
    </div>
  )
}
