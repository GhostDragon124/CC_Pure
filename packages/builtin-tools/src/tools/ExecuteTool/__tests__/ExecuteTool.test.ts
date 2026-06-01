/**
 * ExecuteTool.test.ts
 *
 * 薄层子进程包装器，在独立的 bun:test 进程中运行实际测试。
 * 这样可以防止其他测试文件的 mock.module() 漏出（例如 agentToolUtils.test.ts
 * 对 src/Tool.js 的 mock）影响 ExecuteTool 的测试。
 *
 * SKIP: The subprocess isolation via Bun.spawn(['bun', 'test', ...]) cannot
 * resolve workspace imports (src/Tool.js, CORE_TOOLS from src/constants/tools.js)
 * because the child process doesn't inherit the monorepo's import maps.
 * The runner file (ExecuteTool.runner.test.ts) passes 100% when run directly:
 *   bun test packages/builtin-tools/src/tools/ExecuteTool/__tests__/ExecuteTool.runner.test.ts
 */
import { describe, test, expect } from 'bun:test'

describe('ExecuteTool', () => {
  test.skip('runs all ExecuteTool tests in isolated subprocess', async () => {
    // All ExecuteTool tests pass when run directly — see runner file.
    // This wrapper exists to prevent mock leakage from other test files,
    // but Bun workspace resolution in child processes is broken on this setup.
  })
})
