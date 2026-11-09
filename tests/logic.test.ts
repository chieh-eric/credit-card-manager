import { describe, expect, it } from 'vitest'
import { recommend } from '../src/lib/recommend'
import { csvToTransactions, mergeTxns } from '../src/lib/csv'
import { benefitStatus } from '../src/lib/benefits'
import { defaultState } from '../src/lib/store'
import { CARD_BY_ID, CARDS } from '../src/data/cards'
import { DEFAULT_CPP } from '../src/data/categories'
import { buildIcs, fold } from '../src/lib/ics'

const all = CARDS.map((c) => c.id)
const best = (cat: any) => recommend(cat, all, DEFAULT_CPP)[0].card.id

describe('recommend', () => {
  it('picks sensible cards', () => {
    expect(best('dining')).toBe('amex-gold')
    expect(best('supermarket')).toBe('amex-gold')
    expect(best('gas')).toBe('chase-sapphire-preferred')
    expect(best('drugstore')).toBe('chase-freedom-unlimited')
    expect(best('other')).toBe('capital-one-venture-x')
    expect(best('portalHotel')).toBe('capital-one-venture-x')
    expect(best('hotelHilton')).toBe('amex-hilton-surpass')
    expect(best('vacationRental')).toBe('chase-sapphire-preferred')
  })
  it('never recommends Freedom Unlimited abroad', () => {
    const r = recommend('foreign', all, DEFAULT_CPP)
    expect(r[r.length - 1].card.id).toBe('chase-freedom-unlimited')
  })
  it('does not apply US-only rates abroad', () => {
    const r = recommend('diningAbroad', all, DEFAULT_CPP)
    expect(r.find((x) => x.card.id === 'amex-hilton-surpass')!.multiplier).toBe(3)
  })
})

describe('csv', () => {
  it('parses Chase export (purchases negative)', () => {
    const csv = 'Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n11/03/2026,11/04/2026,DUNKIN #123,Food & Drink,Sale,-6.50,\n11/05/2026,11/06/2026,"GRUBHUB, INC",Food,Sale,-22.10,\n11/07/2026,11/07/2026,Payment,,Payment,500.00,\n'
    const t = csvToTransactions(csv, 'amex-gold')
    expect(t.map((x) => x.amount)).toEqual([6.5, 22.1, -500])
    expect(t[1].description).toBe('GRUBHUB, INC')
  })
  it('parses Capital One debit/credit columns', () => {
    const csv = 'Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit\n2026-10-02,2026-10-03,1234,CAPITAL ONE TRAVEL,Travel,300.00,\n'
    expect(csvToTransactions(csv, 'capital-one-venture-x')[0]).toMatchObject({ date: '2026-10-02', amount: 300 })
  })
  it('dedupes on re-import', () => {
    const csv = 'Date,Description,Amount\n11/03/2026,DUNKIN,7\n'
    const a = csvToTransactions(csv, 'amex-gold')
    const r1 = mergeTxns([], a)
    const r2 = mergeTxns(r1.merged, csvToTransactions(csv, 'amex-gold'))
    expect(r2.added).toBe(0)
  })
})

describe('benefit status', () => {
  it('auto-detects Dunkin usage from transactions', () => {
    const s = defaultState()
    s.transactions = csvToTransactions('Date,Description,Amount\n11/03/2026,DUNKIN #99,4.25\n10/30/2026,DUNKIN,7\n', 'amex-gold')
    const b = CARD_BY_ID['amex-gold'].benefits.find((x) => x.id === 'gold-dunkin')!
    const st = benefitStatus(b, s, new Date(2026, 10, 9))
    expect(st.autoUsed).toBe(4.25)
    expect(st.remaining).toBeCloseTo(2.75)
    expect(st.daysLeft).toBe(21)
  })
})

describe('ics', () => {
  it('folds lines to <= 75 bytes', () => {
    const enc = new TextEncoder()
    for (const l of fold('中文'.repeat(100)).split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75)
  })
  it('builds a calendar', () => {
    const ics = buildIcs(defaultState(), new Date(2026, 10, 9))
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBeGreaterThan(20)
  })
})
