export function receiptLine(name, cents) {
  const amount = (cents / 100).toFixed(2)
  return `[${name}] $${amount}`
}
