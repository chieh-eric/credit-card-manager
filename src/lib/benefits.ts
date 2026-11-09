import { CARD_BY_ID, CARDS } from '../data/cards'
import type { Benefit, Card } from '../data/types'
import { daysUntil, getPeriodWindow, type PeriodWindow } from './periods'
import { usageKey, type AppState, type Txn } from './store'

export interface BenefitStatus {
  benefit: Benefit
  card: Card
  window: PeriodWindow
  used: number
  /** Amount detected from imported transactions. */
  autoUsed: number
  remaining: number
  done: boolean
  daysLeft: number
  urgency: 'done' | 'overdue' | 'urgent' | 'soon' | 'later'
  matches: Txn[]
}

export function matchTransactions(benefit: Benefit, window: PeriodWindow, txns: Txn[]): Txn[] {
  if (!benefit.merchantPatterns?.length) return []
  const re = new RegExp(benefit.merchantPatterns.join('|'), 'i')
  return txns.filter((t) => {
    if (t.cardId !== benefit.cardId || t.amount <= 0) return false
    const [y, m, d] = t.date.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return dt >= window.start && dt <= window.end && re.test(t.description)
  })
}

export function benefitStatus(benefit: Benefit, state: AppState, today: Date, reminderDays = state.reminderDays): BenefitStatus {
  const card = CARD_BY_ID[benefit.cardId]
  const window = getPeriodWindow(benefit, today, state.openDates[benefit.cardId])
  const entry = state.usage[usageKey(benefit.id, window.key)]
  const matches = matchTransactions(benefit, window, state.transactions)
  const autoUsed = Math.min(
    benefit.amount,
    matches.reduce((s, t) => s + t.amount, 0),
  )
  const used = Math.min(benefit.amount, Math.max(entry?.used ?? 0, autoUsed))
  const done = Boolean(entry?.done) || (benefit.amount > 0 && used >= benefit.amount - 0.005)
  const remaining = Math.max(0, benefit.amount - used)
  const daysLeft = daysUntil(window.end, today)
  const urgency: BenefitStatus['urgency'] = done
    ? 'done'
    : daysLeft < 0
      ? 'overdue'
      : daysLeft <= Math.min(3, reminderDays)
        ? 'urgent'
        : daysLeft <= reminderDays
          ? 'soon'
          : 'later'
  return { benefit, card, window, used, autoUsed, remaining, done, daysLeft, urgency, matches }
}

export function allStatuses(state: AppState, today: Date): BenefitStatus[] {
  return CARDS.filter((c) => state.ownedCards.includes(c.id))
    .flatMap((c) => c.benefits)
    .map((b) => benefitStatus(b, state, today))
    // Hide one-time tasks whose deadline passed long ago.
    .filter((s) => !(s.benefit.period === 'once' && s.daysLeft < -30))
}

export interface FeeEvent {
  card: Card
  date: Date
  daysLeft: number
}

/** Annual fee posts around the account anniversary. */
export function upcomingFees(state: AppState, today: Date): FeeEvent[] {
  return CARDS.filter((c) => state.ownedCards.includes(c.id) && c.annualFee > 0 && state.openDates[c.id])
    .map((card) => {
      const w = getPeriodWindow({ period: 'cardYear' }, today, state.openDates[card.id])
      const date = new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 1)
      return { card, date, daysLeft: daysUntil(date, today) }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

/** Value captured in the current card year vs annual fee (rough ROI). */
export function cardYearValue(card: Card, state: AppState, today: Date) {
  // Sum usage entries whose period falls inside the current card year.
  const cy = getPeriodWindow({ period: 'cardYear' }, today, state.openDates[card.id])
  let captured = 0
  let potential = 0
  for (const b of card.benefits) {
    if (b.amount === 0 || b.period === 'every4Years' || b.period === 'once') continue
    // Walk each period starting inside the card year.
    let cursor = new Date(cy.start)
    const seen = new Set<string>()
    while (cursor <= cy.end) {
      const w = getPeriodWindow(b, cursor, state.openDates[card.id])
      if (!seen.has(w.key)) {
        seen.add(w.key)
        potential += b.amount
        if (w.start <= today) {
          const entry = state.usage[usageKey(b.id, w.key)]
          const auto = Math.min(
            b.amount,
            matchTransactions(b, w, state.transactions).reduce((s, t) => s + t.amount, 0),
          )
          captured += entry?.done ? b.amount : Math.min(b.amount, Math.max(entry?.used ?? 0, auto))
        }
      }
      cursor = new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 1)
    }
  }
  return { captured, potential, fee: card.annualFee, window: cy }
}
