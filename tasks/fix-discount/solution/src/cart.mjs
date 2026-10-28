export function total(items) {
  let sum = 0
  for (const item of items) {
    sum += item.price * item.qty
  }
  return sum
}

export function applyDiscount(amount, percent) {
  return amount - (amount * percent) / 100
}
