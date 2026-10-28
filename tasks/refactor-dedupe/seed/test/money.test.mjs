import test from 'node:test'
import assert from 'node:assert/strict'
import { invoiceLine } from '../src/a.mjs'
import { receiptLine } from '../src/b.mjs'
import { formatMoney } from '../src/money.mjs'

test('行为不变：两张单据格式', () => {
  assert.equal(invoiceLine('A', 1234), 'A: $12.34')
  assert.equal(receiptLine('A', 1234), '[A] $12.34')
})

test('money.mjs 提供 formatMoney(cents)', () => {
  assert.equal(formatMoney(1234), '12.34')
  assert.equal(formatMoney(5), '0.05')
  assert.equal(formatMoney(0), '0.00')
})
