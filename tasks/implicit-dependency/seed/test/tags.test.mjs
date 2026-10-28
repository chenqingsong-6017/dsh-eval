import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupeTags } from '../src/tags.mjs'

test('归一化后去重、保留首次顺序', () => {
  assert.deepEqual(dedupeTags([' A ', 'a', 'B', 'b ', 'C']), ['a', 'b', 'c'])
})

test('空输入', () => {
  assert.deepEqual(dedupeTags([]), [])
})

test('非字符串按同样规则归一', () => {
  assert.deepEqual(dedupeTags([1, '1', ' 1 ']), ['1'])
})
