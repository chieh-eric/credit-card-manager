import type { Benefit, Period } from '../data/types'

export interface PeriodWindow {
  key: string
  start: Date
  /** Last day (inclusive) of the window. */
  end: Date
  /** True when the window was guessed because the card open date is missing. */
  assumed?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Same month/day in another year, clamping Feb 29 → Feb 28. */
function anniversaryIn(open: Date, year: number) {
  const lastDay = new Date(year, open.getMonth() + 1, 0).getDate()
  return new Date(year, open.getMonth(), Math.min(open.getDate(), lastDay))
}

function dayBefore(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
}

function anniversaryWindow(open: Date, today: Date, years: number): PeriodWindow {
  let year = today.getFullYear()
  let start = anniversaryIn(open, year)
  if (start > today) start = anniversaryIn(open, --year)
  // Align multi-year windows to the open year.
  const offset = (((year - open.getFullYear()) % years) + years) % years
  start = anniversaryIn(open, year - offset)
  const end = dayBefore(anniversaryIn(open, start.getFullYear() + years))
  return { key: `${years === 1 ? 'CY' : 'C4Y'}-${toISO(start)}`, start, end }
}

export function getPeriodWindow(
  benefit: Pick<Benefit, 'period' | 'deadline'>,
  today: Date,
  openDate?: string,
): PeriodWindow {
  const t = startOfDay(today)
  const y = t.getFullYear()
  const m = t.getMonth()
  const period: Period = benefit.period
  switch (period) {
    case 'monthly':
      return { key: `${y}-${pad(m + 1)}`, start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
    case 'quarterly': {
      const q = Math.floor(m / 3)
      return { key: `${y}-Q${q + 1}`, start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0) }
    }
    case 'semiannual': {
      const h = m < 6 ? 0 : 1
      return { key: `${y}-H${h + 1}`, start: new Date(y, h * 6, 1), end: new Date(y, h * 6 + 6, 0) }
    }
    case 'annual':
      return { key: `${y}`, start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
    case 'cardYear':
    case 'every4Years': {
      const years = period === 'cardYear' ? 1 : 4
      if (openDate) return anniversaryWindow(parseISO(openDate), t, years)
      // Fallback: pretend the card was opened on Jan 1.
      const w = anniversaryWindow(new Date(years === 1 ? y : y - (y % 4), 0, 1), t, years)
      return { ...w, assumed: true }
    }
    case 'once': {
      const end = benefit.deadline ? parseISO(benefit.deadline) : new Date(y, 11, 31)
      return { key: 'once', start: new Date(1970, 0, 1), end }
    }
  }
}

/** The window following the given one (used for calendar reminders). */
export function nextWindow(benefit: Pick<Benefit, 'period' | 'deadline'>, w: PeriodWindow, openDate?: string) {
  if (benefit.period === 'once') return null
  const nextDay = new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 1)
  return getPeriodWindow(benefit, nextDay, openDate)
}

export function daysUntil(end: Date, today: Date) {
  const ms = startOfDay(end).getTime() - startOfDay(today).getTime()
  return Math.round(ms / 86_400_000)
}

export const PERIOD_LABEL: Record<Period, string> = {
  monthly: '每月',
  quarterly: '每季',
  semiannual: '每半年',
  annual: '每年（日曆年）',
  cardYear: '每開卡週年',
  every4Years: '每 4 年',
  once: '一次性',
}

/** How many periods fit in one year (for annualised value). */
export const PERIODS_PER_YEAR: Record<Period, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  cardYear: 1,
  every4Years: 0.25,
  once: 0,
}

export function formatRange(w: PeriodWindow, withYear = false) {
  const f = (d: Date) => `${withYear ? `${d.getFullYear()}/` : ''}${d.getMonth() + 1}/${d.getDate()}`
  return `${f(w.start)}–${f(w.end)}`
}
