import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CARDS } from '../data/cards'
import { DEFAULT_CPP } from '../data/categories'
import type { Currency } from '../data/types'

export interface Txn {
  id: string
  date: string // YYYY-MM-DD
  description: string
  /** Positive = purchase, negative = payment / statement credit. */
  amount: number
  cardId: string
  source: 'csv' | 'simplefin' | 'manual'
}

export interface UsageEntry {
  used: number
  done?: boolean
  updatedAt: string
}

export interface AppState {
  version: 1
  ownedCards: string[]
  openDates: Record<string, string>
  usage: Record<string, UsageEntry>
  enrolled: Record<string, boolean>
  goalProgress: Record<string, number>
  cpp: Record<Currency, number>
  transactions: Txn[]
  /** SimpleFIN account id → card id */
  accountMap: Record<string, string>
  reminderDays: number
  lastNotified?: string
}

const KEY = 'card-benefits:v1'

export const defaultState = (): AppState => ({
  version: 1,
  ownedCards: CARDS.map((c) => c.id),
  openDates: {},
  usage: {},
  enrolled: {},
  goalProgress: {},
  cpp: { ...DEFAULT_CPP },
  transactions: [],
  accountMap: {},
  reminderDays: 7,
})

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export const usageKey = (benefitId: string, periodKey: string) => `${benefitId}|${periodKey}`

interface Ctx {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  today: Date
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(load)
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable – state lives in memory only */
    }
  }, [state])

  // Roll over to a new day if the tab stays open.
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo<Ctx>(() => ({ state, setState: setStateRaw, today }), [state, today])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
