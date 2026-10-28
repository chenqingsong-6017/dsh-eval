/**
 * 成绩单生成器：读 results.jsonl，输出 markdown。
 *
 * 只做汇总，不做判断：通过率、耗时、以及失败原因尾巴，
 * 让"DSH 到底行不行"这个问题有可查的数据，而不是感觉。
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(ROOT, 'results.jsonl')

if (!existsSync(FILE)) {
  console.log('还没有结果：先跑 node harness.mjs prepare/check')
  process.exit(0)
}

const records = readFileSync(FILE, 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line) => JSON.parse(line))

// 同一 (任务, 条件) 只取最新一次：修 bug、重跑、隔离验证都不该重复计数
const latest = new Map()
for (const rec of records) {
  if (rec.condition !== 'plain' && rec.condition !== 'with-md') continue
  const key = `${rec.taskId}|${rec.condition}`
  const prev = latest.get(key)
  if (!prev || String(rec.at) > String(prev.at)) latest.set(key, rec)
}
const clean = [...latest.values()]

const contaminated = clean.filter((rec) => rec.contaminated === true)
const byCondition = new Map()
for (const rec of clean) {
  const key = rec.condition
  const entry = byCondition.get(key) ?? { condition: key, runs: 0, passed: 0, ms: [] }
  entry.runs += 1
  if (rec.passed) entry.passed += 1
  if (typeof rec.elapsedMs === 'number') entry.ms.push(rec.elapsedMs)
  byCondition.set(key, entry)
}

const median = (values) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const fmt = (ms) => (typeof ms === 'number' ? `${(ms / 1000).toFixed(1)}s` : '—（并发不计时）')
const rows = [...byCondition.values()].sort((a, b) => a.condition.localeCompare(b.condition))

console.log('## 成绩单（本地可复现评测 v0.1）\n')
console.log('| 条件 | 通过 | 通过率 | 中位耗时 | 备注 |')
console.log('|---|---|---|---|---|')
for (const row of rows) {
  const note = row.condition === 'with-md' ? '仓库根有 AGENTS.md（规则文件）' : '无规则文件（对照）'
  console.log(`| ${row.condition} | ${row.passed}/${row.runs} | ${((row.passed / row.runs) * 100).toFixed(0)}% | ${fmt(median(row.ms))} | ${note} |`)
}

console.log('\n## 逐条明细\n')
console.log('| 任务 | 条件 | 结果 | 耗时 | 检查耗时 |')
console.log('|---|---|---|---|---|')
for (const rec of clean) {
  console.log(
    `| ${rec.taskId} | ${rec.condition} | ${rec.passed ? '✅ 通过' : '❌ 失败'} | ${fmt(rec.elapsedMs)} | ${fmt(rec.checkMs)} |`,
  )
}

console.log('\n## 污染审计（超出 src/ 的改动）\n')
console.log(contaminated.length === 0 ? '没有检出污染：所有改动都在 `src/` 内。' : '')
for (const rec of contaminated) {
  console.log(`- ${rec.taskId} / ${rec.condition}：${(rec.unexpected ?? []).join('、')}（${rec.runDir}）`)
}

const failures = clean.filter((rec) => !rec.passed)
if (failures.length > 0) {
  console.log('\n## 失败原因（检查器输出尾巴）\n')
  for (const rec of failures) {
    console.log(`### ${rec.taskId} / ${rec.condition}\n`)
    console.log('```')
    console.log(((rec.stderr || rec.stdout || '').trim() || '（无输出）').split('\n').slice(-20).join('\n'))
    console.log('```\n')
  }
}
