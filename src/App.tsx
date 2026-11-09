import { useEffect, useState } from 'react'
import { CardsView } from './components/CardsView'
import { Dashboard } from './components/Dashboard'
import { SettingsView } from './components/SettingsView'
import { SyncView } from './components/SyncView'
import { WhichCard } from './components/WhichCard'
import { allStatuses } from './lib/benefits'
import { dailyReminder } from './lib/notify'
import { toISO } from './lib/periods'
import { useStore, type SyncStatus } from './lib/store'

const TABS = [
  { id: 'today', label: '總覽', icon: '✅' },
  { id: 'which', label: '刷哪張', icon: '💳' },
  { id: 'cards', label: '我的卡', icon: '🗂️' },
  { id: 'data', label: '交易同步', icon: '🔄' },
  { id: 'setup', label: '設定', icon: '⚙️' },
] as const

type TabId = (typeof TABS)[number]['id']

const fromHash = (): TabId => {
  const h = window.location.hash.slice(1)
  return (TABS.find((t) => t.id === h)?.id ?? 'today') as TabId
}

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash)
  const { state, setState, today, sync } = useStore()

  useEffect(() => {
    const onHash = () => setTab(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Once-a-day browser reminder when the app is opened.
  useEffect(() => {
    const iso = toISO(today)
    if (dailyReminder(allStatuses(state, today), state.reminderDays, state.lastNotified, iso)) {
      setState((s) => ({ ...s, lastNotified: iso }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  const go = (t: string) => {
    window.location.hash = t
    window.scrollTo({ top: 0 })
  }

  const title = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">$</div>
            <div>
              <div className="text-sm font-semibold leading-tight">Card Benefits</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {today.getFullYear()}/{today.getMonth() + 1}/{today.getDate()}
                <SyncBadge status={sync} />
              </div>
            </div>
          </div>
          <nav className="hidden gap-1 sm:flex" aria-label="主選單">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:hidden">
          {title.icon} {title.label}
        </h1>
        {tab === 'today' && <Dashboard go={go} />}
        {tab === 'which' && <WhichCard />}
        {tab === 'cards' && <CardsView />}
        {tab === 'data' && <SyncView />}
        {tab === 'setup' && <SettingsView />}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-slate-800 dark:bg-slate-950/95"
        aria-label="主選單"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${tab === t.id ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, [string, string, string]> = {
    local: ['bg-slate-400', '只存在此裝置', '資料存在這個瀏覽器'],
    connecting: ['bg-amber-400 animate-pulse', '連線中', '正在連線到 Claude 雲端'],
    synced: ['bg-emerald-500', '已同步', '已同步到你的 Claude 帳號，其他裝置也看得到'],
    saving: ['bg-sky-500 animate-pulse', '儲存中', '正在儲存到 Claude 雲端'],
    offline: ['bg-rose-500', '未同步', '暫時連不到雲端，變更先存在此裝置'],
  }
  const [dot, label, title] = map[status]
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  )
}
