import { parseArgs } from './parse.mjs'

const { flags, words } = parseArgs(process.argv.slice(2))
const text = words.join(' ')
process.stdout.write(`${flags.includes('shout') ? text.toUpperCase() : text}\n`)
