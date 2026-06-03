import { describe, expect, mock, test } from 'bun:test'
import type { McpHTTPServerConfig } from '../types.js'

mock.module('src/utils/config.js', () => ({
  checkHasTrustDialogAccepted: () => true,
}))
mock.module('src/utils/debug.js', () => ({
  logAntError: () => {},
}))
mock.module('src/utils/log.js', () => ({
  logError: () => {},
  logMCPDebug: () => {},
  logMCPError: () => {},
}))
mock.module('src/services/analytics/index.js', () => ({
  logEvent: () => {},
}))
mock.module('src/utils/slowOperations.js', () => ({
  clone: structuredClone,
  cloneDeep: structuredClone,
  jsonParse: JSON.parse,
  jsonStringify: JSON.stringify,
  slowLogging: () => ({ [Symbol.dispose]: () => {} }),
  writeFileSync_DEPRECATED: () => {},
}))

const { getMcpHeadersFromHelper } = await import('../headersHelper.js')

function makeConfig(headersHelper: string): McpHTTPServerConfig {
  return {
    type: 'http',
    url: 'https://example.com/mcp',
    headersHelper,
  }
}

function validHelperCommand(value: string): string {
  const script =
    'console.log(JSON.stringify({ Authorization: process.argv[1] }))'
  return [process.execPath, '-e', JSON.stringify(script), JSON.stringify(value)].join(
    ' ',
  )
}

describe('getMcpHeadersFromHelper', () => {
  test('executes helper commands with quoted arguments without a shell', async () => {
    const headers = await getMcpHeadersFromHelper(
      'test-server',
      makeConfig(validHelperCommand('Bearer token with spaces')),
    )

    expect(headers).toEqual({ Authorization: 'Bearer token with spaces' })
  })

  test('rejects shell operators in helper commands', async () => {
    const headers = await getMcpHeadersFromHelper(
      'test-server',
      makeConfig(`${validHelperCommand('safe')} ; true`),
    )

    expect(headers).toBeNull()
  })
})
