import { formatMoney } from './money.mjs'

export function invoiceLine(name, cents) {
  return `${name}: $${formatMoney(cents)}`
}
