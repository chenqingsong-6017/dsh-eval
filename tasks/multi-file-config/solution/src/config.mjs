import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_FILE = path.join(HERE, '..', 'data', 'default.json')

export function loadConfig(env = process.env) {
  const config = { ...JSON.parse(readFileSync(DEFAULT_FILE, 'utf8')) }
  if (env.APP_PORT !== undefined) config.port = Number(env.APP_PORT)
  if (env.APP_HOST !== undefined) config.host = String(env.APP_HOST)
  if (env.APP_DEBUG !== undefined) config.debug = /^(1|true|yes)$/i.test(String(env.APP_DEBUG))
  return config
}
