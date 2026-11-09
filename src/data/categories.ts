import type { CategoryId, Currency } from './types'

export interface CategoryInfo {
  id: CategoryId
  label: string
  emoji: string
  hint: string
  /** Purchase happens abroad / in foreign currency → foreign fees & US-only rates matter. */
  abroad?: boolean
  group: '日常' | '旅遊' | '其他'
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'dining', label: '餐廳 / 外送', emoji: '🍽️', hint: '美國境內餐廳、DoorDash、Uber Eats', group: '日常' },
  { id: 'supermarket', label: '超市', emoji: '🛒', hint: 'Whole Foods、Trader Joe’s、Safeway…', group: '日常' },
  { id: 'onlineGrocery', label: '線上買菜', emoji: '📦', hint: 'Instacart、Amazon Fresh', group: '日常' },
  { id: 'gas', label: '加油 / EV 充電', emoji: '⛽', hint: '美國加油站、充電站', group: '日常' },
  { id: 'drugstore', label: '藥局', emoji: '💊', hint: 'CVS、Walgreens', group: '日常' },
  { id: 'streaming', label: '串流訂閱', emoji: '📺', hint: 'Netflix、Spotify、YouTube Premium', group: '日常' },
  { id: 'onlineRetail', label: '網購', emoji: '🛍️', hint: 'Amazon 等美國網購', group: '日常' },
  { id: 'transit', label: '交通 / Uber', emoji: '🚕', hint: 'Uber、Lyft、地鐵、停車', group: '日常' },
  { id: 'other', label: '其他所有消費', emoji: '💳', hint: '沒有加碼的一般消費', group: '日常' },
  { id: 'hotelHilton', label: 'Hilton 飯店', emoji: '🏨', hint: '直接向 Hilton 訂', group: '旅遊' },
  { id: 'hotelMarriott', label: 'Marriott 飯店', emoji: '🏩', hint: '直接向 Marriott 訂', group: '旅遊' },
  { id: 'hotelOther', label: '其他飯店（直訂）', emoji: '🛏️', hint: 'Hyatt、IHG、獨立飯店', group: '旅遊' },
  { id: 'portalHotel', label: '旅遊平台訂飯店/租車', emoji: '🧳', hint: 'Chase Travel / AmexTravel / Capital One Travel', group: '旅遊' },
  { id: 'flightsDirect', label: '機票（航空公司官網）', emoji: '✈️', hint: '直接向航空公司買', group: '旅遊' },
  { id: 'portalFlight', label: '旅遊平台訂機票', emoji: '🛫', hint: 'Chase Travel / AmexTravel / Capital One Travel', group: '旅遊' },
  { id: 'vacationRental', label: 'Airbnb / Vrbo', emoji: '🏡', hint: '直接在 Airbnb、Vrbo 訂', group: '旅遊' },
  { id: 'rentalCar', label: '租車（直訂）', emoji: '🚗', hint: 'Hertz、Avis…', group: '旅遊' },
  { id: 'diningAbroad', label: '國外餐廳', emoji: '🌏', hint: '出國時吃飯', abroad: true, group: '其他' },
  { id: 'foreign', label: '國外 / 外幣消費', emoji: '💱', hint: '出國刷卡、外幣網站', abroad: true, group: '其他' },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryInfo>

export const CURRENCY_LABEL: Record<Currency, string> = {
  MR: 'Amex Membership Rewards',
  UR: 'Chase Ultimate Rewards',
  C1: 'Capital One Miles',
  HILTON: 'Hilton Honors 點數',
  MARRIOTT: 'Marriott Bonvoy 點數',
}

/** Default value per point, in cents. Editable in Settings. */
export const DEFAULT_CPP: Record<Currency, number> = {
  MR: 2.0,
  UR: 2.0,
  C1: 1.8,
  HILTON: 0.5,
  MARRIOTT: 0.8,
}
