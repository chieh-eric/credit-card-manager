import { useEffect, useState } from 'react'
import { CARDS } from '../data/cards'
import { csvToTransactions, mergeTxns } from '../lib/csv'
import { useStore, type Txn } from '../lib/store'
import { ConfirmButton, Section, usd } from './ui'

interface SfAccount {
  id: string
  name: string
  org?: { name?: string }
  transactions: { id: string; posted: number; transacted_at?: number; amount: string; description: string; payee?: string }[]
}

export function SyncView() {
  const { state, setState } = useStore()
  const owned = CARDS.filter((c) => state.ownedCards.includes(c.id))
  const [csvCard, setCsvCard] = useState(owned[0]?.id ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const importCsv = async (file: File) => {
    try {
      const txns = csvToTransactions(await file.text(), csvCard)
      let added = 0
      setState((s) => {
        const r = mergeTxns(s.transactions, txns)
        added = r.added
        return { ...s, transactions: r.merged }
      })
      setMsg({ ok: true, text: `讀到 ${txns.length} 筆，新增 ${added} 筆交易。benefit 使用量已自動更新。` })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    }
  }

  return (
    <div className="space-y-10">
      <Section title="自動偵測 benefit 使用量" subtitle="匯入交易後，系統會比對商家名稱（例如 DUNKIN、GRUBHUB、HILTON）自動算出每個 credit 用了多少">
        {msg && (
          <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}`}>
            {msg.text}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-surface space-y-3 p-5">
            <h3 className="font-semibold">方法 1：匯入 CSV（最簡單，所有銀行都支援）</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Chase：帳戶 → Download account activity → CSV</li>
              <li>Amex：Statements & Activity → Download → CSV</li>
              <li>Capital One：Transactions → Download Transactions → CSV</li>
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input" value={csvCard} onChange={(e) => setCsvCard(e.target.value)} aria-label="這個 CSV 是哪張卡">
                {owned.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </select>
              <label className="btn-primary cursor-pointer">
                選擇 CSV 檔
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importCsv(f)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">檔案只在你的瀏覽器裡處理，不會上傳到任何地方。</p>
          </div>

          <SimpleFin onMessage={setMsg} />
        </div>
      </Section>

      <TxnList txns={state.transactions} onClear={() => setState((s) => ({ ...s, transactions: [] }))} />
    </div>
  )
}

function SimpleFin({ onMessage }: { onMessage: (m: { ok: boolean; text: string }) => void }) {
  const { state, setState } = useStore()
  const [status, setStatus] = useState<'unknown' | 'offline' | 'unlinked' | 'linked'>('unknown')
  const [token, setToken] = useState('')
  const [accounts, setAccounts] = useState<SfAccount[]>([])
  const [busy, setBusy] = useState(false)
  const owned = CARDS.filter((c) => state.ownedCards.includes(c.id))

  useEffect(() => {
    fetch('/api/simplefin/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setStatus(j.linked ? 'linked' : 'unlinked'))
      .catch(() => setStatus('offline'))
  }, [])

  const claim = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/simplefin/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupToken: token.trim() }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? '連結失敗')
      setStatus('linked')
      setToken('')
      onMessage({ ok: true, text: 'SimpleFIN 已連結！按「同步交易」抓取最近 90 天資料。' })
    } catch (e) {
      onMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const sync = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/simplefin/accounts?days=90')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? '同步失敗')
      const accts: SfAccount[] = j.accounts ?? []
      setAccounts(accts)
      const txns: Txn[] = []
      for (const a of accts) {
        const cardId = state.accountMap[a.id]
        if (!cardId) continue
        for (const t of a.transactions) {
          const d = new Date((t.transacted_at || t.posted) * 1000)
          txns.push({
            id: `sf-${t.id}`,
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            description: t.payee ? `${t.payee} ${t.description}` : t.description,
            // Credit-card accounts report purchases as negative amounts.
            amount: -Number(t.amount),
            cardId,
            source: 'simplefin',
          })
        }
      }
      let added = 0
      setState((s) => {
        const ids = new Set(s.transactions.map((t) => t.id))
        const fresh = txns.filter((t) => !ids.has(t.id))
        added = fresh.length
        return { ...s, transactions: [...s.transactions, ...fresh].sort((a, b) => b.date.localeCompare(a.date)) }
      })
      const unmapped = accts.filter((a) => !state.accountMap[a.id]).length
      onMessage({
        ok: true,
        text: `同步完成：${accts.length} 個帳戶，新增 ${added} 筆交易。${unmapped ? `還有 ${unmapped} 個帳戶沒有對應到卡片，請在下方選擇後再同步一次。` : ''}`,
      })
    } catch (e) {
      onMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-surface space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">方法 2：SimpleFIN 自動同步銀行</h3>
        <span
          className={`chip ${
            status === 'linked'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {{ unknown: '檢查中…', offline: '後端未啟動', unlinked: '未連結', linked: '已連結' }[status]}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        透過 SimpleFIN Bridge（約 $15/年，個人使用）唯讀連結 Chase、Amex、Capital One。詳細比較見 <code className="text-xs">docs/BANK_API.md</code>。
      </p>

      {status === 'offline' && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          需要在本機執行 <code>npm run server</code>（後端負責保管你的銀行存取金鑰，不放在瀏覽器）。純前端部署（GitHub Pages）請使用 CSV 匯入。
        </p>
      )}

      {status === 'unlinked' && (
        <div className="space-y-2">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
            <li>到 beta-bridge.simplefin.org 註冊並連結你的銀行</li>
            <li>建立一個 App 連線，複製 Setup Token</li>
            <li>貼在下面</li>
          </ol>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="貼上 SimpleFIN Setup Token" value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="btn-primary" disabled={!token || busy} onClick={claim}>
              連結
            </button>
          </div>
        </div>
      )}

      {status === 'linked' && (
        <div className="space-y-3">
          <button className="btn-primary" disabled={busy} onClick={sync}>
            {busy ? '同步中…' : '🔄 同步交易'}
          </button>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">帳戶 → 卡片對應</div>
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {a.org?.name} · {a.name}
                  </span>
                  <select
                    className="input"
                    value={state.accountMap[a.id] ?? ''}
                    onChange={(e) => setState((s) => ({ ...s, accountMap: { ...s.accountMap, [a.id]: e.target.value } }))}
                  >
                    <option value="">（不追蹤）</option>
                    {owned.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortName}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TxnList({ txns, onClear }: { txns: Txn[]; onClear: () => void }) {
  const [card, setCard] = useState('')
  const shown = txns.filter((t) => !card || t.cardId === card).slice(0, 100)
  const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]))
  return (
    <Section
      title={`已匯入的交易 (${txns.length})`}
      action={
        txns.length > 0 && (
          <div className="flex gap-2">
            <select className="input" value={card} onChange={(e) => setCard(e.target.value)} aria-label="篩選卡片">
              <option value="">全部卡片</option>
              {CARDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName}
                </option>
              ))}
            </select>
            <ConfirmButton label="清除" confirmLabel="刪除所有已匯入的交易？" onConfirm={onClear} />
          </div>
        )
      }
    >
      {txns.length === 0 ? (
        <p className="card-surface p-6 text-center text-sm text-slate-500">還沒有交易資料。沒有匯入也沒關係 — 可以直接在總覽手動勾選。</p>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shown.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">{t.date}</td>
                  <td className="max-w-xs truncate px-3 py-2">{t.description}</td>
                  <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">{byId[t.cardId]?.shortName}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${t.amount < 0 ? 'text-emerald-600' : ''}`}>{usd(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
