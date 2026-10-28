/**
 * 自动检查：跑 node --test。
 */
import { spawnSync } from 'node:child_process'

const runDir = process.argv[2]
if (!runDir) {
  console.error('用法：node check.mjs <runDir>')
  process.exit(2)
}
const result = spawnSync(process.execPath, ['--test'], { cwd: runDir, encoding: 'utf8', timeout: 90_000 })
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
process.exit(result.status === 0 ? 0 : 1)
