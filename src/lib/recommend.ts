import { CARDS } from '../data/cards'
import { CATEGORY_BY_ID } from '../data/categories'
import type { Card, CategoryId, Currency, EarnRate } from '../data/types'

export interface Recommendation {
  card: Card
  multiplier: number
  /** Estimated return in cents per dollar spent. */
  cents: number
  note?: string
  warning?: string
}

function rateFor(card: Card, category: CategoryId): EarnRate {
  const find = (c: CategoryId) => card.earn.find((e) => e.category === c)
  const other = find('other') ?? { category: 'other', multiplier: 1 }
  if (category === 'diningAbroad') {
    const abroad = find('diningAbroad')
    if (abroad) return abroad
    const dining = find('dining')
    return dining && !dining.usOnly ? dining : other
  }
  if (category === 'foreign') return other
  return find(category) ?? other
}

export function recommend(category: CategoryId, owned: string[], cpp: Record<Currency, number>): Recommendation[] {
  const abroad = CATEGORY_BY_ID[category].abroad
  return CARDS.filter((c) => owned.includes(c.id))
    .map((card) => {
      const r = rateFor(card, category)
      let cents = r.multiplier * cpp[card.currency]
      let warning: string | undefined
      if (abroad && card.foreignTxFee) {
        cents -= 3
        warning = '有 3% 海外交易手續費'
      }
      return { card, multiplier: r.multiplier, cents, note: r.note, warning }
    })
    .sort((a, b) => b.cents - a.cents || b.multiplier - a.multiplier)
}

/** Extra advice that a pure earn-rate comparison misses. */
export const CATEGORY_TIPS: Partial<Record<CategoryId, string[]>> = {
  dining: [
    'Grubhub / Five Guys / Cheesecake Factory / Buffalo Wild Wings / Wonder → 用 Amex Gold 拿每月 $10 Dining Credit。',
    'Resy 合作餐廳 → Amex Gold（每半年 $50）。',
    "Dunkin' → Amex Gold（每月 $7）。",
  ],
  transit: ['Uber / Uber Eats 先用 Amex Gold 每月 $10 Uber Cash，用完再刷 Sapphire Preferred（2x）。'],
  hotelHilton: ['Surpass 每季 $50 Hilton credit — 本季還沒用就一定要刷 Surpass。', '直接向 Hilton 訂房才算 credit。'],
  hotelMarriott: ['記得用 Boundless 每年的 35k Free Night Award。'],
  portalHotel: [
    'Capital One Travel：先用掉 Venture X 每年 $300 credit，飯店/租車 10x。',
    'Chase Travel：Sapphire Preferred 每年 $100 hotel credit。',
    'AmexTravel 預付飯店：Gold 5x；2 晚以上可選 The Hotel Collection 拿 $100 額度。',
  ],
  portalFlight: ['Venture X $300 travel credit 也能用在 Capital One Travel 機票。'],
  flightsDirect: ['Amex Gold 3x 機票，但沒有航班延誤/取消險 — 重視保險可改刷 Sapphire Preferred（2x + 旅遊保險）。'],
  rentalCar: ['Sapphire Preferred 與 Venture X 都有「主要」租車保險；Amex Gold 只有次級保險。'],
  foreign: ['Freedom Unlimited 有 3% 海外手續費，出國不要用。', 'Hilton 卡的 5x/6x 只限美國，海外只剩 3x。'],
  diningAbroad: ['Amex Gold 全球餐廳 4x、Sapphire Preferred 3x，且都免海外手續費。'],
  other: ['Venture X 2x miles 是一般消費最划算的選擇。', '如果在衝 Hilton Surpass $15k Free Night，可以把一般消費轉到 Surpass（3x Hilton）。'],
  supermarket: ['Amex Gold 4x 只限美國超市，每年 $25k 上限；Target / Walmart / Costco 不算超市。'],
  drugstore: ['Freedom Unlimited 3x 藥局是這張卡最有價值的類別。'],
  gas: ['Sapphire Preferred 自 2026/6 起加油 3x；Hilton Surpass 6x Hilton 點數價值較低。'],
}
