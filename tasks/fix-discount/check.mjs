/**
 * 自动检查：在 runDir 里跑 `node --test`。
 * 只认退出码，不看模型怎么说 —— 这是评测和"自评"的根本区别。
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const runDir = process.argv[2]
if (!runDir) {
  console.error('用法：node check.mjs <runDir>')
  process.exit(2)
}

// 测试文件不许被改：被改过直接判失败（防止"改测试让它过"）
const testFile = path.join(runDir, 'test', 'cart.test.mjs')
if (!existsSync(testFile)) {
  console.error('测试文件不见了：test/cart.test.mjs')
  process.exit(1)
}

const result = spawnSync(process.execPath, ['--test'], { cwd: runDir, encoding: 'utf8', timeout: 90_000 })
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
process.exit(result.status === 0 ? 0 : 1)
