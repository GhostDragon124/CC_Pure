import { describe, expect, test } from 'bun:test'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(testDir, '../../../../..')

async function runIsolatedTestFile(relativePath: string) {
  const proc = Bun.spawn([process.execPath, 'test', relativePath], {
    cwd: projectRoot,
    env: process.env,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  expect(`${stdout}\n${stderr}`).toEqual(expect.stringContaining('0 fail'))
  expect(exitCode).toBe(0)
}

describe('queryModelOpenAI isolated runner', () => {
  test('runs queryModelOpenAI regression suite without leaking mocks', async () => {
    await runIsolatedTestFile(
      './src/services/api/openai/__tests__/queryModelOpenAI.runner.ts',
    )
  })
})
