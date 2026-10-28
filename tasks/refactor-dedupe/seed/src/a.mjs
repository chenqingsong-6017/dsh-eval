export function invoiceLine(name, cents) {
  const amount = (cents / 100).toFixed(2)
  return `${name}: $${amount}`
}
