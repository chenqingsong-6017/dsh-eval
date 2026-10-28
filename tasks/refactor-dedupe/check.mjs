/**
 * 自动检查：行为 + 结构（重复真的消失了）。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const runDir = process.argv[2]
if (!runDir) {
  console.error('用法：node check.mjs <runDir>')
  process.exit(2)
}

const result = spawnSync(process.execPath, ['--test'], { cwd: runDir, encoding: 'utf8', timeout: 90_000 })
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
if (result.status !== 0) process.exit(1)

let failed = 0
const check = (label, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  ← ${detail}`}`)
  if (!ok) failed += 1
}

for (const file of ['a.mjs', 'b.mjs']) {
  const source = readFileSync(path.join(runDir, 'src', file), 'utf8')
  check(`${file} 复用了 money.mjs`, /from\s+['"]\.\/money\.mjs['"]/.test(source), '没找到 import')
  check(`${file} 里重复实现已消失`, !/toFixed\s*\(\s*2\s*\)/.test(source), '仍出现 toFixed(2)')
}

process.exit(failed === 0 ? 0 : 1)
