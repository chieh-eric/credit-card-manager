import type { BenefitStatus } from './benefits'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/** Shows one browser notification summarising credits expiring soon. */
export async function requestAndNotify(statuses: BenefitStatus[], days: number): Promise<string> {
  if (!notificationsSupported()) return '這個瀏覽器不支援通知，請改用「加入行事曆」。'
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (perm !== 'granted') return '通知權限被拒絕 — 可以改用「加入行事曆」，提醒會更可靠。'
  const due = statuses.filter((s) => !s.done && s.daysLeft >= 0 && s.daysLeft <= days)
  if (!due.length) {
    new Notification('信用卡 Benefits', { body: `未來 ${days} 天沒有要到期的 credit 👍` })
    return '已開啟通知。之後每次打開網頁都會提醒即將到期的項目。'
  }
  const body = due
    .slice(0, 5)
    .map((s) => `${s.card.shortName} ${s.benefit.name}${s.remaining ? ` $${s.remaining}` : ''}（剩 ${s.daysLeft} 天）`)
    .join('\n')
  new Notification(`${due.length} 個 credit 快到期`, { body })
  return '已開啟通知。之後每次打開網頁都會提醒即將到期的項目。'
}

/** Called on app load: at most one reminder per day when permission was granted. */
export function dailyReminder(statuses: BenefitStatus[], days: number, lastNotified: string | undefined, todayISO: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted' || lastNotified === todayISO) return false
  const due = statuses.filter((s) => !s.done && s.daysLeft >= 0 && s.daysLeft <= days)
  if (!due.length) return false
  new Notification(`${due.length} 個 credit 快到期`, {
    body: due
      .slice(0, 5)
      .map((s) => `${s.card.shortName} ${s.benefit.name}（剩 ${s.daysLeft} 天）`)
      .join('\n'),
  })
  return true
}
