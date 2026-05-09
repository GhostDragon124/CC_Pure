import { EXECUTE_TOOL_NAME } from './constants.js'

export const DESCRIPTION =
  'ExecuteExtraTool — a first-class core tool that is always loaded and available. Execute any deferred tool by name with parameters. Use it after discovering a tool via SearchExtraTools. This is NOT a remote or external tool — it runs locally with full permissions.'

export function getPrompt(): string {
  return `ExecuteExtraTool — always loaded, always available. Runs locally with full permissions — NOT a remote or external tool.

## What it does
Accepts a tool_name and params, looks up the target tool in the registry, and delegates execution to it. The target tool runs with the same permissions as if called directly.

When to use: After SearchExtraTools discovers a deferred tool name, call this tool with {"tool_name": "<name>", "params": {...}} to invoke it immediately.
When NOT to use: For core tools already in your tool list (Read, Edit, Write, Bash, Glob, Grep, Agent, WebFetch, WebSearch, Skill, etc.) — call those directly.

## How to call — two-step workflow

If the tool is not found, an error message will be returned suggesting to use SearchExtraTools to discover available tools.`
}
