/**
 * Thin adapter over the claude.ai artifact runtime (window.claude). When the
 * app runs anywhere else (local dev, GitHub Pages) these fall back to plain
 * browser behaviour.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<Any> }
  }
}

export const inClaude = () => typeof window !== 'undefined' && typeof window.claude?.use === 'function'

export async function useCapability<T = Any>(name: string): Promise<T | null> {
  if (!inClaude()) return null
  try {
    return (await window.claude!.use(name)) as T | null
  } catch {
    return null
  }
}

/** File extensions the claude.ai download prompt accepts. */
const CLAUDE_ALLOWED = ['txt', 'json', 'md', 'csv', 'html']

export interface SaveOutcome {
  ok: boolean
  message: string
  /** Actual filename used (may differ in claude.ai). */
  filename?: string
}

export async function saveTextFile(filename: string, text: string, mime: string): Promise<SaveOutcome> {
  if (inClaude()) {
    const downloads = await useCapability('downloads')
    if (!downloads) return { ok: false, message: '這個檢視方式無法下載檔案。' }
    const ext = filename.split('.').pop()!.toLowerCase()
    const name = CLAUDE_ALLOWED.includes(ext) ? filename : `${filename}.txt`
    try {
      await downloads.save({ filename: name, data: text })
      return { ok: true, message: '已儲存', filename: name }
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'declined') return { ok: false, message: '已取消下載。' }
      if (code === 'rate_limited') return { ok: false, message: '已經有一個下載視窗開著，請先完成它。' }
      return { ok: false, message: '下載失敗，請稍後再試。' }
    }
  }
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, message: '已下載', filename }
}
