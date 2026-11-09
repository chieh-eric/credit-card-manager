import { describe, expect, it } from 'vitest'
import { getPeriodWindow, nextWindow, toISO, daysUntil } from '../src/lib/periods'

const d = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd) }
const w = (period: any, today: string, open?: string) => {
  const r = getPeriodWindow({ period }, d(today), open)
  return [toISO(r.start), toISO(r.end)]
}

describe('periods', () => {
  it('monthly / quarterly / semiannual / annual', () => {
    expect(w('monthly', '2026-11-09')).toEqual(['2026-11-01', '2026-11-30'])
    expect(w('monthly', '2028-02-10')).toEqual(['2028-02-01', '2028-02-29'])
    expect(w('quarterly', '2026-11-09')).toEqual(['2026-10-01', '2026-12-31'])
    expect(w('semiannual', '2026-03-01')).toEqual(['2026-01-01', '2026-06-30'])
    expect(w('semiannual', '2026-07-01')).toEqual(['2026-07-01', '2026-12-31'])
    expect(w('annual', '2026-11-09')).toEqual(['2026-01-01', '2026-12-31'])
  })
  it('card year follows the anniversary', () => {
    expect(w('cardYear', '2026-11-09', '2024-03-15')).toEqual(['2026-03-15', '2027-03-14'])
    expect(w('cardYear', '2026-02-01', '2024-03-15')).toEqual(['2025-03-15', '2026-03-14'])
    expect(w('cardYear', '2026-03-15', '2024-03-15')).toEqual(['2026-03-15', '2027-03-14'])
  })
  it('leap-day open date clamps to Feb 28', () => {
    expect(w('cardYear', '2026-06-01', '2024-02-29')).toEqual(['2026-02-28', '2027-02-27'])
  })
  it('every 4 years aligns to open year', () => {
    expect(w('every4Years', '2026-11-09', '2023-05-01')).toEqual(['2023-05-01', '2027-04-30'])
    expect(w('every4Years', '2027-05-01', '2023-05-01')).toEqual(['2027-05-01', '2031-04-30'])
  })
  it('flags assumed windows without an open date', () => {
    expect(getPeriodWindow({ period: 'cardYear' }, d('2026-11-09')).assumed).toBe(true)
  })
  it('next window', () => {
    const cur = getPeriodWindow({ period: 'quarterly' }, d('2026-11-09'))
    const nxt = nextWindow({ period: 'quarterly' }, cur)!
    expect(toISO(nxt.start)).toBe('2027-01-01')
  })
  it('days until', () => {
    expect(daysUntil(d('2026-11-30'), d('2026-11-09'))).toBe(21)
  })
})
