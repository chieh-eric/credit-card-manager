import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { inClaude, useCapability } from './platform'
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

const KEY = 'card-benefits:v2'
const OLD_KEYS = ['card-benefits:v1']
/** Keep the cloud document well under the 256 KiB limit. */
const MAX_CLOUD_TXNS = 1500

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
    for (const k of OLD_KEYS) localStorage.removeItem(k)
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export const usageKey = (benefitId: string, periodKey: string) => `${benefitId}|${periodKey}`

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'offline'

interface Ctx {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  today: Date
  sync: SyncStatus
}

const StoreContext = createContext<Ctx | null>(null)

const serialize = (st: AppState) =>
  JSON.stringify({ ...st, lastNotified: undefined, transactions: st.transactions.slice(0, MAX_CLOUD_TXNS) })

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(load)
  const [today, setToday] = useState(() => new Date())
  const [sync, setSync] = useState<SyncStatus>(inClaude() ? 'connecting' : 'local')
  const docRef = useRef<{ set: (d: Record<string, unknown>) => Promise<void> } | null>(null)
  const lastCloud = useRef<string | null>(null)
  const ready = useRef(false)
  const writing = useRef(false)
  const pending = useRef<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable – state lives in memory only */
    }
  }, [state])

  // Cloud sync through the claude.ai artifact database (one private doc per viewer).
  useEffect(() => {
    if (!inClaude()) return
    let unsub: (() => void) | undefined
    let cancelled = false
    const timer = setTimeout(() => !ready.current && setSync('offline'), 10_000)
    ;(async () => {
      const [db, user] = await Promise.all([useCapability('db'), useCapability('user')])
      const uid = user ? await user.id() : null
      if (cancelled) return
      if (!db || !uid) {
        clearTimeout(timer)
        setSync('local')
        return
      }
      const ref = db.doc(`data/users/${uid}/state`)
      docRef.current = ref
      unsub = ref.onSnapshot(
        (snap: { exists: boolean; data(): Record<string, unknown> | undefined; metadata: { fromCache: boolean; hasPendingWrites: boolean } }) => {
          if (snap.metadata.hasPendingWrites) return
          const json = snap.exists ? String(snap.data()?.json ?? '') : ''
          if (json && json !== lastCloud.current) {
            lastCloud.current = json
            try {
              const remote = JSON.parse(json) as Partial<AppState>
              setStateRaw((cur) => ({ ...defaultState(), ...remote, lastNotified: cur.lastNotified }))
            } catch {
              /* ignore malformed doc */
            }
          }
          if (!snap.metadata.fromCache) {
            clearTimeout(timer)
            if (!ready.current) {
              ready.current = true
              // First visit: nothing stored yet — start fresh.
              if (!snap.exists) setStateRaw(() => defaultState())
            }
            setSync('synced')
          }
        },
        () => {
          clearTimeout(timer)
          setSync('offline')
        },
      )
    })()
    return () => {
      cancelled = true
      clearTimeout(timer)
      unsub?.()
    }
  }, [])

  // Write local changes to the cloud, one write at a time, debounced.
  useEffect(() => {
    if (!ready.current || !docRef.current) return
    const json = serialize(state)
    if (json === lastCloud.current) return
    const t = setTimeout(async () => {
      pending.current = json
      if (writing.current) return
      writing.current = true
      setSync('saving')
      try {
        while (pending.current && pending.current !== lastCloud.current) {
          const next = pending.current
          lastCloud.current = next
          await docRef.current!.set({ json: next, updatedAt: new Date().toISOString() })
        }
        setSync('synced')
      } catch {
        setSync('offline')
      } finally {
        writing.current = false
      }
    }, 600)
    return () => clearTimeout(t)
  }, [state])

  // Roll over to a new day if the tab stays open.
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo<Ctx>(() => ({ state, setState: setStateRaw, today, sync }), [state, today, sync])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
