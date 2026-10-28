/**
 * 自动检查：行为（node --test）+ 结构（必须复用现有 helper，不能重复实现）。
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

const source = readFileSync(path.join(runDir, 'src', 'tags.mjs'), 'utf8')
check('复用了 src/text.mjs（应有 import）', /from\s+['"]\.\/text\.mjs['"]/.test(source), '没找到 import')
check('没有重复实现归一化（不应出现 toLowerCase）', !/toLowerCase\s*\(/.test(source), '自己写了 toLowerCase')

process.exit(failed === 0 ? 0 : 1)
