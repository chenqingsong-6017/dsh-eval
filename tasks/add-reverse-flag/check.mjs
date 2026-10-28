/**
 * 自动检查：跑三种用法，逐字节比对 stdout。
 * 行为类任务只认输出，不认解释。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const runDir = process.argv[2]
if (!runDir) {
  console.error('用法：node check.mjs <runDir>')
  process.exit(2)
}

const run = (args) => {
  const result = spawnSync(process.execPath, ['cli.mjs', ...args], { cwd: runDir, encoding: 'utf8', timeout: 20_000 })
  return { code: result.status, out: result.stdout ?? '', err: result.stderr ?? '' }
}

const cases = [
  { args: ['a', 'b', 'c'], expect: 'a b c\n', label: '不带标志保持原样' },
  { args: ['--reverse', 'a', 'b', 'c'], expect: 'c b a\n', label: '--reverse 反转且不含标志' },
  { args: [], expect: '\n', label: '空参数只输出换行' },
  { args: ['--reverse'], expect: '\n', label: '只有 --reverse 时输出空行' },
]

let failed = 0
for (const item of cases) {
  const got = run(item.args)
  const ok = got.code === 0 && got.out === item.expect
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.label}  args=${JSON.stringify(item.args)}`)
  if (!ok) {
    failed += 1
    console.log(`     期望 ${JSON.stringify(item.expect)}，实际 ${JSON.stringify(got.out)}（exit=${got.code}）`)
    if (got.err) console.log(`     stderr: ${got.err.trim().slice(0, 300)}`)
  }
}
process.exit(failed === 0 ? 0 : 1)
