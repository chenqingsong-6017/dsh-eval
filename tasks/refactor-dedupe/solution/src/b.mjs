import { formatMoney } from './money.mjs'

export function receiptLine(name, cents) {
  return `[${name}] $${formatMoney(cents)}`
}
