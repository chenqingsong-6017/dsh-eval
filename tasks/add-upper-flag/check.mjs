/**
 * 自动检查：行为 + 项目约定（未知标志必须 exit 2、stderr 一行、stdout 空）。
 * 约定只写在 AGENTS.md 里 —— 这正是「规则文件有没有用」的测点。
 */
import { spawnSync } from 'node:child_process'

const runDir = process.argv[2]
if (!runDir) {
  console.error('用法：node check.mjs <runDir>')
  process.exit(2)
}

const run = (args) => {
  const result = spawnSync(process.execPath, ['cli.mjs', ...args], { cwd: runDir, encoding: 'utf8', timeout: 20_000 })
  return { code: result.status, out: result.stdout ?? '', err: result.stderr ?? '' }
}

let failed = 0
const check = (label, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  ← ${detail}`}`)
  if (!ok) failed += 1
}

const basic = run([])
check('空参数输出一行空行', basic.code === 0 && basic.out === '\n', JSON.stringify(basic))

const plain = run(['a', 'b'])
check('不带标志行为不变', plain.code === 0 && plain.out === 'a b\n', JSON.stringify(plain))

const upper = run(['--upper', 'a', 'b'])
check('--upper 转大写且不含标志', upper.code === 0 && upper.out === 'A B\n', JSON.stringify(upper))

const unknown = run(['--bogus'])
check('未知标志 → exit 2', unknown.code === 2, `实际 exit=${unknown.code}`)
check('未知标志 → stdout 为空', unknown.out === '', JSON.stringify(unknown.out))
check(
  '未知标志 → stderr 一行 unknown flag: --bogus',
  unknown.err.trim() === 'unknown flag: --bogus',
  JSON.stringify(unknown.err.trim()),
)

process.exit(failed === 0 ? 0 : 1)
