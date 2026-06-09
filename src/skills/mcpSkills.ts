// MCP skills — fetches skills/commands exposed via MCP servers.
// Dynamically require'd by services/mcp/client.ts and useManageMCPConnections.ts
// when MCP_SKILLS feature is enabled.

import {
  type ListToolsResult,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { buildMcpToolName } from '../services/mcp/mcpStringUtils.js'
import type { MCPServerConnection } from '../services/mcp/types.js'
import type { Command } from '../types/command.js'
import { errorMessage } from '../utils/errors.js'
import {
  FRONTMATTER_REGEX,
  parseFrontmatter,
} from '../utils/frontmatterParser.js'
import { logMCPError } from '../utils/log.js'
import { memoizeWithLRU } from '../utils/memoize.js'
import { recursivelySanitizeUnicode } from '../utils/sanitization.js'
import { getMCPSkillBuilders } from './mcpSkillBuilders.js'

const MCP_FETCH_CACHE_SIZE = 20

function hasSkillFrontmatter(description: unknown): description is string {
  return typeof description === 'string' && FRONTMATTER_REGEX.test(description)
}

export const fetchMcpSkillsForClient = memoizeWithLRU(
  async (client: MCPServerConnection): Promise<Command[]> => {
    if (client.type !== 'connected') return []
    if (!client.capabilities?.tools) return []

    try {
      const result = (await client.client.request(
        { method: 'tools/list' },
        ListToolsResultSchema,
      )) as ListToolsResult

      const toolsToProcess = recursivelySanitizeUnicode(result.tools)
      const { createSkillCommand, parseSkillFrontmatterFields } =
        getMCPSkillBuilders()
      const commands: Command[] = []

      for (const tool of toolsToProcess) {
        if (!hasSkillFrontmatter(tool.description)) continue

        try {
          const skillName = buildMcpToolName(client.name, tool.name)
          const { frontmatter, content: markdownContent } = parseFrontmatter(
            tool.description,
            `mcp:${client.name}:${tool.name}`,
          )
          const parsed = parseSkillFrontmatterFields(
            frontmatter,
            markdownContent,
            skillName,
          )

          commands.push(
            createSkillCommand({
              ...parsed,
              displayName:
                parsed.displayName ?? `${client.name}:${tool.name} (MCP)`,
              skillName,
              markdownContent,
              source: 'mcp',
              baseDir: undefined,
              loadedFrom: 'mcp',
              paths: undefined,
            }),
          )
        } catch (error) {
          logMCPError(
            client.name,
            `Failed to parse MCP skill '${tool.name}': ${errorMessage(error)}`,
          )
        }
      }

      return commands
    } catch (error) {
      logMCPError(
        client.name,
        `Failed to fetch MCP skills: ${errorMessage(error)}`,
      )
      return []
    }
  },
  (client: MCPServerConnection) => client.name,
  MCP_FETCH_CACHE_SIZE,
)
