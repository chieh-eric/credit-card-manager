import type { Txn } from './store'

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

function normDate(s: string): string | null {
  s = s.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return null
}

const num = (s: string | undefined) => {
  if (!s) return 0
  const v = parseFloat(s.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'))
  return Number.isFinite(v) ? v : 0
}

/**
 * Parses statement CSV exports from Chase, Amex and Capital One (and most
 * other banks). Purchases are returned as positive amounts.
 */
export function csvToTransactions(text: string, cardId: string): Txn[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)))
  const iDate = idx('transaction date', 'trans. date', 'date')
  const iDesc = idx('description', 'merchant', 'name', 'payee')
  const iAmount = header.findIndex((h) => h === 'amount')
  const iDebit = idx('debit')
  const iCredit = idx('credit')
  if (iDate < 0 || iDesc < 0 || (iAmount < 0 && iDebit < 0)) {
    throw new Error('看不懂這個 CSV 格式：需要日期、描述、金額欄位。')
  }

  const body = rows.slice(1)
  let flip = false
  if (iAmount >= 0) {
    // Chase exports purchases as negative; Amex as positive. Use the majority.
    const neg = body.filter((r) => num(r[iAmount]) < 0).length
    flip = neg > body.length / 2
  }

  const out: Txn[] = []
  body.forEach((r, n) => {
    const date = normDate(r[iDate] ?? '')
    if (!date) return
    const amount = iAmount >= 0 ? num(r[iAmount]) * (flip ? -1 : 1) : num(r[iDebit]) - (iCredit >= 0 ? num(r[iCredit]) : 0)
    const description = (r[iDesc] ?? '').trim()
    out.push({
      id: `csv-${cardId}-${date}-${description}-${amount}-${n}`,
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      cardId,
      source: 'csv',
    })
  })
  return out
}

/** Merge new transactions, de-duplicating by (card, date, description, amount). */
export function mergeTxns(existing: Txn[], incoming: Txn[]): { merged: Txn[]; added: number } {
  const sig = (t: Txn) => `${t.cardId}|${t.date}|${t.description.toUpperCase()}|${t.amount}`
  const seen = new Map<string, number>()
  for (const t of existing) seen.set(sig(t), (seen.get(sig(t)) ?? 0) + 1)
  const added: Txn[] = []
  const incomingCount = new Map<string, number>()
  for (const t of incoming) {
    const s = sig(t)
    const c = (incomingCount.get(s) ?? 0) + 1
    incomingCount.set(s, c)
    // Allow genuine duplicates within one file (two $7 Dunkin' runs on the same day).
    if (c > (seen.get(s) ?? 0)) added.push(t)
  }
  const merged = [...existing, ...added].sort((a, b) => b.date.localeCompare(a.date))
  return { merged, added: added.length }
}
