import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.mjs'

test('没有环境变量时用文件里的默认值', () => {
  assert.deepEqual(loadConfig({}), { port: 3000, host: 'localhost', debug: false })
})

test('环境变量覆盖文件，且类型正确', () => {
  assert.deepEqual(loadConfig({ APP_PORT: '8080', APP_HOST: '0.0.0.0', APP_DEBUG: 'true' }), {
    port: 8080,
    host: '0.0.0.0',
    debug: true,
  })
})

test('APP_DEBUG=0 或 false 时为 false', () => {
  assert.equal(loadConfig({ APP_DEBUG: '0' }).debug, false)
  assert.equal(loadConfig({ APP_DEBUG: 'false' }).debug, false)
})

test('只覆盖给到的键', () => {
  const config = loadConfig({ APP_PORT: '1' })
  assert.equal(config.port, 1)
  assert.equal(config.host, 'localhost')
})
