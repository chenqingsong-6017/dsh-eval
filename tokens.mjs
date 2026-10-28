/**
 * Token accounting: attribute token usage to individual eval runs.
 *
 * Data source: the DeepSeek Harness cross-session usage ledger, produced by the
 * `dsh-usage` plugin as it scans session logs. Point this at that JSON file with
 * DSH_USAGE_STORE, or let it fall back to ~/.dsh/usage/usage.json.
 *
 * Usage:
 *   node tokens.mjs                      # every session in the ledger
 *   node tokens.mjs --map token-map.json # attach human labels (session prefix -> label)
 *   node tokens.mjs --json
 *
 * token-map.json format: { "1b3b9b00": "task-a / plain", "2c9d3a73": "task-a / with-md" }
 */
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const STORE = process.env.DSH_USAGE_STORE || path.join(os.homedir(), '.dsh', 'usage', 'usage.json')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const mapIndex = args.indexOf('--map')
const mapFile = mapIndex >= 0 ? args[mapIndex + 1] : undefined

if (!existsSync(STORE)) {
  console.error(`找不到用量台账：${STORE}\n用 DSH_USAGE_STORE 指向它（dsh-usage 插件生成）。`)
  process.exit(2)
}

let labels = new Map()
if (mapFile && existsSync(mapFile)) {
  for (const [prefix, label] of Object.entries(JSON.parse(readFileSync(mapFile, 'utf8')))) labels.set(prefix, label)
}

const store = JSON.parse(readFileSync(STORE, 'utf8'))
const sessions = new Map()
for (const [file, entry] of Object.entries(store.files ?? {})) {
  const id = entry.sessionId ?? file
  const agg = sessions.get(id) ?? { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  for (const bucket of entry.buckets ?? []) {
    agg.calls += bucket.calls ?? 0
    agg.input += bucket.input ?? 0
    agg.output += bucket.output ?? 0
    agg.cacheRead += bucket.cacheRead ?? 0
    agg.cacheWrite += bucket.cacheWrite ?? 0
    agg.total += bucket.total ?? 0
  }
  sessions.set(id, agg)
}

const labelOf = (id) => {
  for (const [prefix, label] of labels) if (id.startsWith(prefix)) return label
  return ''
}

const fmt = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

const rows = [...sessions.entries()]
  .map(([id, agg]) => ({ id: id.slice(0, 8), label: labelOf(id), ...agg }))
  .sort((a, b) => b.total - a.total)

if (asJson) {
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

const hasLabel = rows.some((row) => row.label !== '')
console.log(hasLabel ? '| 运行 | session | 调用 | 输入 | 输出 | 缓存读 | 合计 |' : '| session | 调用 | 输入 | 输出 | 缓存读 | 合计 |')
console.log(hasLabel ? '|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|')
for (const row of rows) {
  const cells = [row.calls, fmt(row.input), fmt(row.output), fmt(row.cacheRead), fmt(row.total)]
  console.log(hasLabel ? `| ${row.label || '—'} | ${row.id} | ${cells.join(' | ')} |` : `| ${row.id} | ${cells.join(' | ')} |`)
}

const total = rows.reduce((acc, row) => acc + row.total, 0)
const cacheShare = total === 0 ? 0 : (rows.reduce((acc, row) => acc + row.cacheRead, 0) / total) * 100
console.log(`\n共 ${rows.length} 段会话，合计 ${fmt(total)} tokens；其中缓存读占 ${cacheShare.toFixed(0)}%。`)
