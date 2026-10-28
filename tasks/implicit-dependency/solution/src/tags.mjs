import { normalize } from './text.mjs'

export function dedupeTags(tags) {
  const seen = new Set()
  const out = []
  for (const tag of tags) {
    const value = normalize(tag)
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}
