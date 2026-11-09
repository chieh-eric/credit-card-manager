export type Currency = 'MR' | 'UR' | 'C1' | 'HILTON' | 'MARRIOTT'

/** How often a credit resets. */
export type Period =
  | 'monthly' // calendar month
  | 'quarterly' // calendar quarter
  | 'semiannual' // Jan–Jun / Jul–Dec
  | 'annual' // calendar year
  | 'cardYear' // account anniversary year (needs open date)
  | 'every4Years' // e.g. Global Entry / TSA PreCheck (anniversary-based)
  | 'once' // one-time task with a fixed deadline

export type CategoryId =
  | 'dining'
  | 'diningAbroad'
  | 'supermarket'
  | 'onlineGrocery'
  | 'gas'
  | 'flightsDirect'
  | 'hotelHilton'
  | 'hotelMarriott'
  | 'hotelOther'
  | 'portalHotel'
  | 'portalFlight'
  | 'vacationRental'
  | 'rentalCar'
  | 'transit'
  | 'streaming'
  | 'drugstore'
  | 'onlineRetail'
  | 'foreign'
  | 'other'

export interface EarnRate {
  category: CategoryId
  multiplier: number
  /** Short note shown in the UI (caps, conditions, portal name...). */
  note?: string
  /** Only valid inside the US. */
  usOnly?: boolean
}

export interface Benefit {
  id: string
  cardId: string
  name: string
  /** Dollar value per period. */
  amount: number
  period: Period
  /** ISO date for `once` tasks. */
  deadline?: string
  howToUse: string
  enrollment?: boolean
  /** Regex sources matched (case-insensitive) against transaction descriptions to auto-detect usage. */
  merchantPatterns?: string[]
  /** Usage cannot be seen in bank transactions (e.g. Uber Cash, free night certificates). */
  manualOnly?: boolean
  /** Not a dollar credit (e.g. free night / status task) – value is an estimate. */
  estimated?: boolean
  unverified?: boolean
}

export interface Card {
  id: string
  name: string
  shortName: string
  issuer: 'American Express' | 'Chase' | 'Capital One'
  network: 'Amex' | 'Visa' | 'Mastercard'
  annualFee: number
  currency: Currency
  /** Gradient stops used for the card art (dark → light). */
  color: [string, string, string]
  /** Text colour on the card face. */
  ink: 'light' | 'dark'
  /** Metal cards get a brushed sheen. */
  finish: 'metal' | 'plastic'
  foreignTxFee: boolean
  earn: EarnRate[]
  benefits: Benefit[]
  perks: string[]
  protections: string[]
  notes: string[]
  sources: { label: string; url: string }[]
  lastVerified: string
}
