export function total(items) {
  let sum = 0
  for (const item of items) {
    sum += item.price * item.qty
  }
  return sum
}

/**
 * 按百分比打折：percent 是百分数（10 表示 10%）。
 */
export function applyDiscount(amount, percent) {
  return amount - amount * percent
}
