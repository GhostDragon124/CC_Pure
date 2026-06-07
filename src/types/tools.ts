// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Progress types used by built-in tools. These are re-exported via src/Tool.ts.
// Currently all types are generic Record<string, unknown> until upstream provides
// concrete progress field definitions from the decompiled Anthropic SDK.

/** Progress data for AgentTool execution */
export type AgentToolProgress = Record<string, unknown>

/** Progress data for Bash tool execution */
export type BashProgress = Record<string, unknown>

/** Progress data for MCP tool execution */
export type MCPProgress = Record<string, unknown>

/** Progress data for REPL tool execution */
export type REPLToolProgress = Record<string, unknown>

/** Progress data for Skill tool execution */
export type SkillToolProgress = Record<string, unknown>

/** Progress data for TaskOutput tool */
export type TaskOutputProgress = Record<string, unknown>

/** Union of all tool progress types — the canonical Progress type used by Tool.ts */
export type ToolProgressData = Record<string, unknown>

/** Progress data for WebSearch tool */
export type WebSearchProgress = Record<string, unknown>

/** Progress data for Shell operations */
export type ShellProgress = Record<string, unknown>

/** Progress data for PowerShell tool */
export type PowerShellProgress = Record<string, unknown>

/** Progress data for SDK workflow progress events */
export type SdkWorkflowProgress = Record<string, unknown>
