// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// MCP skills — fetches skills/commands exposed via MCP servers.
// Dynamically require'd by services/mcp/client.ts and useManageMCPConnections.ts
// when MCP_SKILLS feature is enabled.
// Stub: returns empty array of Command.

import type { Command } from 'src/types/command.js'

export const fetchMcpSkillsForClient: ((...args: unknown[]) => Promise<Command[]>) & { cache: Map<string, unknown> } = Object.assign(
  (..._args: unknown[]) => Promise.resolve([] as Command[]),
  { cache: new Map<string, unknown>() },
)
