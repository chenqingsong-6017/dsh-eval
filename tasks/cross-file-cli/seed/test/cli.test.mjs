import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { parseArgs } from '../src/parse.mjs'

test('parseArgs：-- 之后一律当字面量，-- 本身丢弃', () => {
  assert.deepEqual(parseArgs(['--shout', 'a', '--', '--shout', 'b']), {
    flags: ['shout'],
    words: ['a', '--shout', 'b'],
  })
})

test('cli：--shout 让整体转大写', () => {
  const run = spawnSync(process.execPath, ['src/cli.mjs', '--shout', 'a', 'b'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, 'A B\n')
})

test('cli：-- 之后的 --shout 不生效，按字面量输出', () => {
  const run = spawnSync(process.execPath, ['src/cli.mjs', 'a', '--', '--shout', 'b'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, 'a --shout b\n')
})

test('cli：不带标志时行为不变', () => {
  const run = spawnSync(process.execPath, ['src/cli.mjs', 'a', 'b'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, 'a b\n')
})
