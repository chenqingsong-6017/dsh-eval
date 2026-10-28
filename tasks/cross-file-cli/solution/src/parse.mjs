export function parseArgs(argv) {
  const flags = []
  const words = []
  let literal = false
  for (const arg of argv) {
    if (literal) {
      words.push(arg)
      continue
    }
    if (arg === '--') {
      literal = true
      continue
    }
    if (arg.startsWith('--') && arg.length > 2) {
      flags.push(arg.slice(2))
      continue
    }
    words.push(arg)
  }
  return { flags, words }
}
