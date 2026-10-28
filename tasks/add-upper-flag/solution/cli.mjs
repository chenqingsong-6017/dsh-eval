const argv = process.argv.slice(2)
const KNOWN = new Set(['--upper'])
const unknown = argv.find((arg) => arg.startsWith('--') && !KNOWN.has(arg))
if (unknown !== undefined) {
  process.stderr.write(`unknown flag: ${unknown}\n`)
  process.exit(2)
}

const upper = argv.includes('--upper')
const args = argv.filter((arg) => arg !== '--upper')
const out = args.join(' ')
process.stdout.write(upper ? `${out.toUpperCase()}\n` : `${out}\n`)
