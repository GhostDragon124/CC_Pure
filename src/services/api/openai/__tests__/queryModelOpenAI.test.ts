import { describe, expect, test } from 'bun:test'

async function runIsolatedTestFile(path: string) {
  const proc = Bun.spawn([process.execPath, 'test', path], {
    cwd: process.cwd(),
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
