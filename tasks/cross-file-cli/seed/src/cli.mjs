import { parseArgs } from './parse.mjs'

const { words } = parseArgs(process.argv.slice(2))
process.stdout.write(`${words.join(' ')}\n`)
