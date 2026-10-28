const raw = process.argv.slice(2)
const reverse = raw.includes('--reverse')
const args = raw.filter((arg) => arg !== '--reverse')
const out = reverse ? [...args].reverse() : args
process.stdout.write(`${out.join(' ')}\n`)
