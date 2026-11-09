import { CARDS } from '../data/cards'
import { getPeriodWindow, nextWindow, toISO, type PeriodWindow } from './periods'
import type { AppState } from './store'
import { upcomingFees } from './benefits'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const ymd = (d: Date) => toISO(d).replace(/-/g, '')

const enc = new TextEncoder()

/** Fold long lines to <=75 octets per RFC 5545 (UTF-8 aware, never splits a character). */
export function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > 74) {
      out.push(cur)
      cur = ' '
      bytes = 1
    }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out.join('\r\n')
}

interface Ev {
  uid: string
  date: Date
  title: string
  description: string
  alarmDays: number
}

/**
 * Builds an .ics file with one all-day event on the last day of every benefit
 * period for the next `months` months, each with an alarm `reminderDays` before.
 */
export function buildIcs(state: AppState, today: Date, months = 12): string {
  const horizon = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
  const events: Ev[] = []

  for (const card of CARDS.filter((c) => state.ownedCards.includes(c.id))) {
    const open = state.openDates[card.id]
    for (const b of card.benefits) {
      let w: PeriodWindow | null = getPeriodWindow(b, today, open)
      while (w && w.end <= horizon) {
        if (w.end >= today) {
          events.push({
            uid: `${b.id}-${w.key}@card-benefits`,
            date: w.end,
            title: `${card.shortName}: ${b.name}${b.amount ? ` $${b.amount}` : ''} 到期`,
            description: `${b.howToUse}\n\n期間：${toISO(w.start)} ~ ${toISO(w.end)}`,
            alarmDays: state.reminderDays,
          })
        }
        w = nextWindow(b, w, open)
      }
    }
  }

  for (const f of upcomingFees(state, today)) {
    if (f.date > horizon) continue
    events.push({
      uid: `fee-${f.card.id}-${toISO(f.date)}@card-benefits`,
      date: f.date,
      title: `${f.card.shortName} 年費 $${f.card.annualFee} 即將入帳`,
      description: '評估是否續卡 / 降級 / 打電話要 retention offer。',
      alarmDays: 30,
    })
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//card-benefits//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:信用卡 Benefits',
  ]
  for (const e of events) {
    const next = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.description)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(e.title)}`,
      `TRIGGER:-P${e.alarmDays}D`,
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
