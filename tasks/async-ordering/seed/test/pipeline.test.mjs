import test from 'node:test'
import assert from 'node:assert/strict'
import { runSteps } from '../src/pipeline.mjs'

test('串行执行：下一步开始前上一步必须已完成', async () => {
  const log = []
  const steps = [1, 2, 3].map((n) => async () => {
    log.push(`start${n}`)
    await new Promise((resolve) => setTimeout(resolve, n === 1 ? 25 : 1))
    log.push(`end${n}`)
    return n
  })
  const results = await runSteps(steps)
  assert.deepEqual(results, [1, 2, 3])
  assert.deepEqual(log, ['start1', 'end1', 'start2', 'end2', 'start3', 'end3'])
})

test('空输入返回空数组', async () => {
  assert.deepEqual(await runSteps([]), [])
})
