/**
 * 本地评测骨架 v0.1
 *
 * 为什么要这个：2026 年的公开榜（Next.js Agent Evals / Terminal-Bench 4.0）都在测
 * 「同一批任务、同一套 harness，谁通过得多」。DSH 一直没报名，等于没有成绩单。
 * 报名外部榜需要对方的基础设施；本地能先做的，是把**同一套方法论**跑起来：
 * 固定任务 + 自动检查 + 可复现的初始状态 + 记录耗时。
 *
 * 用法：
 *   node harness.mjs list
 *   node harness.mjs prepare <taskId> <condition>   # condition: plain | with-md
 *   node harness.mjs check   <taskId> <runDir>
 *
 * 产物：runs/ 下每次一份目录 + meta.json；结果追加进 results.jsonl。
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const TASKS = path.join(ROOT, 'tasks')
const RUNS = path.join(ROOT, 'runs')

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')

function taskDir(id) {
  return path.join(TASKS, id)
}

/** 递归列出目录里的相对路径（跳过 .git / node_modules / meta.json）。 */
function listFiles(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'meta.json') continue
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

/**
 * 污染审计：把运行目录和 seed 逐文件比对。
 *
 * 评测的最大敌人不是模型不会做，是"环境把 agent 带偏"——
 * 例如 agent 为了满足宿主验证门，自己补了个 package.json。
 * 这里把超出 src/ 的改动全部记为 unexpected，让污染可见，而不是假装没发生。
 */
export function audit(taskId, runDir) {
  const seedDir = path.join(taskDir(taskId), 'seed')
  const runFiles = listFiles(runDir)
  const seedFiles = existsSync(seedDir) ? listFiles(seedDir) : []
  const changed = []
  const added = []
  const removed = []
  for (const file of runFiles) {
    const runPath = path.join(runDir, file)
    const seedPath = path.join(seedDir, file)
    if (!existsSync(seedPath)) {
      added.push(file)
      continue
    }
    if (!readFileSync(runPath).equals(readFileSync(seedPath))) changed.push(file)
  }
  for (const file of seedFiles) {
    if (!existsSync(path.join(runDir, file))) removed.push(file)
  }
  // harness 自己注入的文件不算污染（靠 meta 记录，而不是靠文件名猜）
  const injected = new Set()
  try {
    const meta = JSON.parse(readFileSync(path.join(runDir, 'meta.json'), 'utf8'))
    if (meta?.injectedPackageJson === true) injected.add('package.json')
    if (meta?.condition === 'with-md') injected.add('AGENTS.md')
  } catch {
    // meta 缺失就按没有注入处理
  }
  const unexpected = [...added, ...changed, ...removed].filter(
    (file) => !injected.has(file) && !file.startsWith('src/'),
  )
  return { changed, added, removed, unexpected }
}

function listTasks() {
  if (!existsSync(TASKS)) return []
  return readdirSync(TASKS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => existsSync(path.join(taskDir(id), 'prompt.md')) && existsSync(path.join(taskDir(id), 'check.mjs')))
}

function prepare(id, condition) {
  const dir = taskDir(id)
  if (!existsSync(dir)) throw new Error(`任务不存在：${id}\n可用：${listTasks().join(', ')}`)
  const runDir = path.join(RUNS, `${stamp()}-${id}-${condition}`)
  mkdirSync(runDir, { recursive: true })
  const seed = path.join(dir, 'seed')
  if (existsSync(seed)) cpSync(seed, runDir, { recursive: true })
  // 中和宿主的验证门：有些 agent 会因为「没有 package.json → npm run check 跑不起来」
  // 自掏腰包补一个 package.json，把评测污染成"应付工作区插件"。
  // 这里预先放一个最小 package.json，让 check 脚本等价于跑测试，agent 就没理由再折腾它。
  const pkgFile = path.join(runDir, 'package.json')
  const injectedPackageJson = !existsSync(pkgFile)
  if (injectedPackageJson) {
    writeFileSync(
      pkgFile,
      JSON.stringify({ name: 'eval-fixture', private: true, type: 'module', scripts: { check: 'node --test' } }, null, 2),
      'utf8',
    )
  }
  if (condition === 'with-md') {
    const rules = path.join(dir, 'AGENTS.md')
    if (existsSync(rules)) cpSync(rules, path.join(runDir, 'AGENTS.md'))
    else writeFileSync(path.join(runDir, 'AGENTS.md'), '# 约定\n- 改完必须自己跑测试并确认通过。\n', 'utf8')
  }
  const meta = {
    taskId: id,
    condition,
    runDir,
    startedAt: Date.now(),
    injectedPackageJson,
    prompt: readFileSync(path.join(dir, 'prompt.md'), 'utf8').trim(),
  }
  writeFileSync(path.join(runDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
  // 给运行目录建一个 git 基线：agent 能 diff（这个要求它自己提过），我们也能审计改动。
  const git = (gitArgs) =>
    spawnSync('git', ['-c', 'user.email=eval@local', '-c', 'user.name=eval', '-c', 'init.defaultBranch=main', ...gitArgs], {
      cwd: runDir,
      encoding: 'utf8',
      timeout: 20_000,
    })
  const init = git(['init', '-q'])
  if (init.status === 0) {
    git(['add', '-A'])
    git(['commit', '-q', '-m', 'seed'])
  }
  console.log(runDir)
  return runDir
}

function check(id, runDir) {
  const checker = path.join(taskDir(id), 'check.mjs')
  if (!existsSync(checker)) throw new Error(`任务 ${id} 缺 check.mjs`)
  // 统一解析成绝对路径：检查器进程的 cwd 就是运行目录，传相对路径会解析错位
  const absRunDir = path.resolve(runDir)
  const metaFile = path.join(absRunDir, 'meta.json')
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : { taskId: id, startedAt: Date.now(), condition: 'unknown' }
  const started = Date.now()
  const result = spawnSync(process.execPath, [checker, absRunDir], {
    cwd: absRunDir,
    encoding: 'utf8',
    timeout: 120_000,
  })
  const passed = result.status === 0
  const auditResult = audit(id, absRunDir)
  // 并发批跑（同一时刻 6 个 agent 抢模型）的墙钟没有比较意义，不记时长
  const parallel = meta?.prompt === '(parallel batch run)'
  const record = {
    at: new Date().toISOString(),
    taskId: id,
    condition: meta.condition ?? 'unknown',
    runDir: absRunDir,
    passed,
    contaminated: auditResult.unexpected.length > 0,
    unexpected: auditResult.unexpected,
    changed: auditResult.changed,
    exitCode: result.status,
    elapsedMs: parallel ? null : started - (meta.startedAt ?? started),
    checkMs: Date.now() - started,
    stdout: String(result.stdout ?? '').slice(-4000),
    stderr: String(result.stderr ?? '').slice(-4000),
  }
  appendFileSync(path.join(ROOT, 'results.jsonl'), `${JSON.stringify(record)}\n`, 'utf8')
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${id}  ${record.condition}  ${(record.elapsedMs / 1000).toFixed(1)}s`)
  if (!passed) {
    const detail = (record.stderr || record.stdout || '').trim()
    if (detail) console.log(detail.split('\n').slice(-12).join('\n'))
  }
  return record
}

/**
 * 任务自检：每个任务必须满足两条，否则任务本身写错了，评测结果没有意义。
 *   1. 只有 seed（桩/坏代码）→ 检查器必须判 FAIL
 *   2. seed + solution 覆盖 → 检查器必须判 PASS
 */
function selftest() {
  const rows = []
  let bad = 0
  for (const id of listTasks()) {
    const dir = taskDir(id)
    const checker = path.join(dir, 'check.mjs')
    const solution = path.join(dir, 'solution')
    const runChecker = (runDir) => spawnSync(process.execPath, [checker, runDir], { cwd: runDir, encoding: 'utf8', timeout: 120_000 })

    const base = mkdtempSync(path.join(tmpdir(), `eval-${id}-base-`))
    cpSync(path.join(dir, 'seed'), base, { recursive: true })
    const baseRes = runChecker(base)

    let refStatus = 'n/a'
    let refOk = true
    if (existsSync(solution)) {
      const ref = mkdtempSync(path.join(tmpdir(), `eval-${id}-ref-`))
      cpSync(path.join(dir, 'seed'), ref, { recursive: true })
      cpSync(solution, ref, { recursive: true })
      const refRes = runChecker(ref)
      refStatus = refRes.status === 0 ? 'PASS' : 'FAIL'
      refOk = refRes.status === 0
    } else {
      refStatus = '缺 solution'
      refOk = false
    }

    const ok = baseRes.status !== 0 && refOk
    if (!ok) bad += 1
    rows.push({ id, baseline: baseRes.status === 0 ? 'PASS(错)' : 'FAIL(对)', reference: refStatus, ok })
  }

  console.log('## 任务自检（桩必须 FAIL，参考解必须 PASS）\n')
  console.log('| 任务 | 桩状态 | 参考解 | 结论 |')
  console.log('|---|---|---|---|')
  for (const row of rows) console.log(`| ${row.id} | ${row.baseline} | ${row.reference} | ${row.ok ? '✅' : '❌ 任务写错了'} |`)
  console.log(`\n共 ${rows.length} 个任务，${rows.length - bad} 个自检通过，${bad} 个有问题。`)
  if (bad > 0) process.exitCode = 1
}


const [command, ...args] = process.argv.slice(2)

switch (command) {
  case 'list':
    for (const id of listTasks()) console.log(id)
    break
  case 'prepare':
    prepare(args[0], args[1] ?? 'plain')
    break
  case 'check':
    check(args[0], args[1])
    break
  case 'selftest':
    selftest()
    break
  case 'audit':
    console.log(JSON.stringify(audit(args[0], args[1]), null, 2))
    break
  default:
    console.log('用法：node harness.mjs list | prepare <taskId> <plain|with-md> | check <taskId> <runDir> | selftest')
}
