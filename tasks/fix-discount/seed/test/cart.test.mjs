import test from 'node:test'
import assert from 'node:assert/strict'
import { total, applyDiscount } from '../src/cart.mjs'

test('total 累加价格 × 数量', () => {
  assert.equal(total([{ price: 10, qty: 2 }, { price: 5, qty: 3 }]), 35)
  assert.equal(total([]), 0)
})

test('applyDiscount 传百分数得到折后价', () => {
  assert.equal(applyDiscount(100, 10), 90)
  assert.equal(applyDiscount(200, 25), 150)
})

test('applyDiscount 0% 不打折', () => {
  assert.equal(applyDiscount(100, 0), 100)
})
