// Minimal local backend: keeps the SimpleFIN access URL (a bank read credential)
// out of the browser and serves the built frontend. No dependencies.
//
//   npm run build && npm run server   → http://localhost:8787
//   npm run dev (in another terminal) → Vite proxies /api to this server
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DATA_DIR = join(ROOT, 'server', '.data')
const CRED_FILE = join(DATA_DIR, 'simplefin.json')
const DIST = join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'

async function loadAccessUrl() {
  try {
    return JSON.parse(await readFile(CRED_FILE, 'utf8')).accessUrl
  } catch {
    return null
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  let data = ''
  for await (const chunk of req) {
    data += chunk
    if (data.length > 10_000) throw new Error('body too large')
  }
  return data ? JSON.parse(data) : {}
}

/** SimpleFIN protocol: https://www.simplefin.org/protocol.html */
async function claim(setupToken) {
  const claimUrl = Buffer.from(setupToken, 'base64').toString('utf8').trim()
  if (!/^https:\/\//.test(claimUrl)) throw new Error('Setup Token 格式不正確')
  const r = await fetch(claimUrl, { method: 'POST', headers: { 'content-length': '0' } })
  if (!r.ok) throw new Error(`SimpleFIN 拒絕了這個 token（${r.status}）。Token 只能使用一次，請重新產生。`)
  const accessUrl = (await r.text()).trim()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(CRED_FILE, JSON.stringify({ accessUrl, claimedAt: new Date().toISOString() }), { mode: 0o600 })
}

async function accounts(days) {
  const accessUrl = await loadAccessUrl()
  if (!accessUrl) throw Object.assign(new Error('尚未連結 SimpleFIN'), { status: 400 })
  const u = new URL(accessUrl)
  const auth = Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64')
  u.username = ''
  u.password = ''
  const start = Math.floor(Date.now() / 1000) - days * 86400
  const url = `${u.toString().replace(/\/$/, '')}/accounts?start-date=${start}`
  const r = await fetch(url, { headers: { authorization: `Basic ${auth}` } })
  if (r.status === 403) throw Object.assign(new Error('SimpleFIN 存取被撤銷，請重新連結'), { status: 403 })
  if (!r.ok) throw new Error(`SimpleFIN 錯誤 ${r.status}`)
  return r.json()
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' }

async function serveStatic(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(DIST, path)
  if (!file.startsWith(DIST)) return send(res, 403, { error: 'forbidden' })
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(DIST, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('Run `npm run build` first, or use `npm run dev`.')
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    if (url.pathname === '/api/simplefin/status') return send(res, 200, { linked: Boolean(await loadAccessUrl()) })
    if (url.pathname === '/api/simplefin/claim' && req.method === 'POST') {
      const { setupToken } = await readBody(req)
      if (!setupToken) return send(res, 400, { error: '缺少 setupToken' })
      await claim(setupToken)
      return send(res, 200, { linked: true })
    }
    if (url.pathname === '/api/simplefin/accounts') {
      const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 90)))
      return send(res, 200, await accounts(days))
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' })
    return serveStatic(req, res)
  } catch (e) {
    send(res, e.status ?? 500, { error: e.message })
  }
}).listen(PORT, HOST, () => console.log(`Card Benefits server → http://${HOST}:${PORT}`))
