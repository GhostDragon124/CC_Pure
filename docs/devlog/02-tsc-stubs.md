# TSC Stubs 记录

> 创建日期: 2026-06-07
> 关联计划: docs/plans/tsc-decompile-fix-plan.md
> 阶段: Phase 1 — 消除 "Cannot find module" 类型错误

## 成果总结

- **创建 stub 数**: 25 个
- **消除 "Cannot find module" 错误**: 75 个全部消除（75 → 0）
- **构建状态**: bun run build 通过 ✅
- **剩余 TS 错误**: 204 个（均为类型不匹配、属性不存在、变量未定义等其他错误类型）

## Stub 清单

### src/types/tools.ts
- **引用方**: 17 个文件（Tool.ts, BashModeProgress.tsx, sdkEventQueue.ts, processBashCommand.tsx, sdkProgress.ts, AgentTool.tsx, AgentTool/UI.tsx, MCPTool.ts, MCPTool/UI.tsx, PowerShellTool.tsx, PowerShellTool/UI.tsx, SkillTool.ts, TaskOutputTool.tsx, WebSearchTool.ts, BashTool.tsx ×2）
- **导出内容**: AgentToolProgress, BashProgress, MCPProgress, REPLToolProgress, SkillToolProgress, TaskOutputProgress, ToolProgressData, WebSearchProgress, ShellProgress, PowerShellProgress, SdkWorkflowProgress
- **补全优先级**: **高** — 这些类型被工具系统广泛引用，需要从上游恢复具体字段定义
- **备注**: 当前所有类型均为 `Record<string, unknown>`。bridge-green 版本同样是 `any` 类型的自动生成 stub

### src/types/utils.ts
- **引用方**: 16 个文件（AppStateStore.ts, Tool.ts, taskStatusUtils.tsx, 各 task dialog, messageQueueManager.ts, mappers.ts, messages.ts, 各 MonitorMcpTask dialog）
- **导出内容**: DeepImmutable<T>, Permutations<T>
- **补全优先级**: **高** — DeepImmutable 用于工具权限上下文类型
- **备注**: 当前为 identity passthrough。bridge-green 版本同样是 `any` 类型的自动生成 stub

### src/services/contextCollapse/operations.ts
- **引用方**: 2 个文件（context.tsx, context-noninteractive.ts — 通过动态 `require()`）
- **导出内容**: projectView(messages: Message[]) => Message[]
- **补全优先级**: **中** — 仅在 CONTEXT_COLLAPSE feature flag 启用时被调用
- **备注**: bridge-green 版本也是 no-op stub，导出为空

### src/commands/peers/index.ts
- **引用方**: 1 个文件（commands.ts — 动态 import）
- **导出内容**: default export (空对象)
- **补全优先级**: **低** — peer 功能被 feature-gated
- **备注**: bridge-green 版本也是空 stub

### src/commands/fork/index.ts
- **引用方**: 1 个文件（commands.ts — 动态 import）
- **导出内容**: default export (空对象)
- **补全优先级**: **低** — fork 功能被 feature-gated
- **备注**: bridge-green 版本也是空 stub

### src/components/messages/UserGitHubWebhookMessage.tsx
- **引用方**: 1 个文件（UserTextMessage.tsx — 通过动态 `require()`，KAIROS_GITHUB_WEBHOOKS feature flag）
- **导出内容**: UserGitHubWebhookMessage (React 组件，渲染 null)
- **补全优先级**: **低** — 仅在 KAIROS_GITHUB_WEBHOOKS 启用时使用
- **备注**: bridge-green 版本不存在此文件

### src/components/messages/UserForkBoilerplateMessage.tsx
- **引用方**: 1 个文件（UserTextMessage.tsx — 通过动态 `require()`，FORK_SUBAGENT feature flag）
- **导出内容**: UserForkBoilerplateMessage (React 组件，渲染 null)
- **补全优先级**: **低** — 仅在 FORK_SUBAGENT 启用时使用
- **备注**: bridge-green 版本不存在此文件

### src/components/messages/UserCrossSessionMessage.tsx
- **引用方**: 1 个文件（UserTextMessage.tsx — 通过动态 `require()`，UDS_INBOX feature flag）
- **导出内容**: UserCrossSessionMessage (React 组件，渲染 null)
- **补全优先级**: **低** — 仅在 UDS_INBOX 启用时使用
- **备注**: bridge-green 版本不存在此文件

### src/services/compact/snipProjection.ts
- **引用方**: 3 个文件（Message.tsx, QueryEngine.ts, messages.ts — 通过动态 `require()`，HISTORY_SNIP feature flag）
- **导出内容**: isSnipBoundaryMessage(message) => boolean, projectSnippedView(messages) => Message[]
- **补全优先级**: **中** — 历史对话压缩功能
- **备注**: bridge-green 版本也是 no-op stub

### src/components/messages/SnipBoundaryMessage.tsx
- **引用方**: 1 个文件（Message.tsx — 通过动态 `require()`，HISTORY_SNIP feature flag）
- **导出内容**: SnipBoundaryMessage (React 组件，渲染 null)
- **补全优先级**: **低** — 仅在 HISTORY_SNIP 启用时使用
- **备注**: bridge-green 版本不存在此文件

### src/components/permissions/ReviewArtifactPermissionRequest/ReviewArtifactPermissionRequest.tsx
- **引用方**: 1 个文件（PermissionRequest.tsx — 通过动态 `require()`，REVIEW_ARTIFACT feature flag）
- **导出内容**: ReviewArtifactPermissionRequest (React 组件，渲染 null)
- **补全优先级**: **低** — 仅在 REVIEW_ARTIFACT 启用时使用
- **备注**: bridge-green 版本不存在此文件

### src/environment-runner/main.ts
- **引用方**: 1 个文件（entrypoints/cli.tsx — 动态 import）
- **导出内容**: environmentRunnerMain(args: string[]) => Promise<void>
- **补全优先级**: **低** — BYOC runner，feature-gated
- **备注**: bridge-green 版本也是 no-op stub

### src/self-hosted-runner/main.ts
- **引用方**: 1 个文件（entrypoints/cli.tsx — 动态 import）
- **导出内容**: selfHostedRunnerMain(args: string[]) => Promise<void>
- **补全优先级**: **低** — BYOC runner，feature-gated
- **备注**: bridge-green 版本也是 no-op stub

### src/services/contextCollapse/persist.ts
- **引用方**: 3 个文件（ResumeConversation.tsx, sessionRestore.ts ×2 — 动态 `require()`）
- **导出内容**: restoreFromEntries(...args) => void
- **补全优先级**: **中** — 会话恢复功能
- **备注**: bridge-green 版本也是 no-op stub

### src/memdir/memoryShapeTelemetry.ts
- **引用方**: 2 个文件（findRelevantMemories.ts, sessionFileAccessHooks.ts — 动态 `require()`，MEMORY_SHAPE_TELEMETRY feature flag）
- **导出内容**: logMemoryRecallShape, logMemoryWriteShape
- **补全优先级**: **低** — 仅用于 telemetry/analytics
- **备注**: bridge-green 版本也是 no-op stub

### src/skills/mcpSkills.ts
- **引用方**: 2 个文件（services/mcp/client.ts, useManageMCPConnections.ts — 动态 `require()`，MCP_SKILLS feature flag）
- **导出内容**: fetchMcpSkillsForClient (返回 Promise<Command[]>)
- **补全优先级**: **中** — MCP 技能发现功能
- **备注**: bridge-green 版本也是 stub，带 cache map

### src/services/skillSearch/signals.ts
- **引用方**: 2 个文件（prefetch.ts, attachments.ts — 直接 import type）
- **导出内容**: DiscoverySignal (type)
- **补全优先级**: **中** — 技能搜索系统的基础类型
- **备注**: bridge-green 版本为 `any` 类型 stub，当前为完整对象类型

### src/tasks/design-system/Byline.tsx
- **引用方**: 2 个文件（MonitorMcpDetailDialog.tsx, WorkflowDetailDialog.tsx）
- **导出内容**: Byline (React 组件)
- **补全优先级**: **低** — MonitorMcpTask 仅在 monitor 模式下使用
- **备注**: bridge-green 版本不存在

### src/tasks/design-system/Dialog.tsx
- **引用方**: 2 个文件（MonitorMcpDetailDialog.tsx, WorkflowDetailDialog.tsx）
- **导出内容**: Dialog (React 组件)
- **补全优先级**: **低** — MonitorMcpTask 仅在 monitor 模式下使用
- **备注**: bridge-green 版本不存在

### src/tasks/design-system/KeyboardShortcutHint.tsx
- **引用方**: 2 个文件（MonitorMcpDetailDialog.tsx, WorkflowDetailDialog.tsx）
- **导出内容**: KeyboardShortcutHint (React 组件)
- **补全优先级**: **低** — MonitorMcpTask 仅在 monitor 模式下使用
- **备注**: bridge-green 版本不存在

### src/tools/ToolSearchTool/constants.ts
- **引用方**: 1 个文件（prompt.ts — 直接 import）
- **导出内容**: TOOL_SEARCH_TOOL_NAME = 'ToolSearch'
- **补全优先级**: **高** — ToolSearch 工具需要此常量
- **备注**: 此文件内容从 bridge-green 版本直接复制，是真实实现

### src/utils/toolSearch.ts
- **引用方**: 1 个文件（ToolSearchTool.ts — 直接 import）
- **导出内容**: isToolSearchEnabledOptimistic() => boolean
- **补全优先级**: **高** — ToolSearch 工具需要此函数判断是否启用 ToolSearch
- **备注**: bridge-green 版本有完整实现（~400 行），当前仅导出最小接口

### src/types/messageQueueTypes.ts
- **引用方**: 3 个文件（logs.ts, messageQueueManager.ts, sessionStorage.ts）
- **导出内容**: QueueOperation, QueueOperationMessage
- **补全优先级**: **高** — 消息队列系统的基础类型
- **备注**: bridge-green 版本也是 stub，内容基本一致

### src/utils/postCommitAttribution.ts
- **引用方**: 1 个文件（worktree.ts — 动态 import()，COMMIT_ATTRIBUTION feature flag）
- **导出内容**: installPrepareCommitMsgHook
- **补全优先级**: **低** — 仅在 COMMIT_ATTRIBUTION 启用时使用
- **备注**: bridge-green 版本也是 no-op stub

## 补全优先级排序

### 高优先级（需要尽快恢复真实实现）
1. **src/types/tools.ts** — 17 处引用，工具系统核心类型
2. **src/types/utils.ts** — 16 处引用，类型工具
3. **src/utils/toolSearch.ts** — ToolSearch 工具依赖
4. **src/types/messageQueueTypes.ts** — 消息队列系统类型
5. **src/tools/ToolSearchTool/constants.ts** — 常量（已为真实值）

### 中优先级（feature-gated 但有多个引用）
6. **src/services/contextCollapse/operations.ts** — feature: CONTEXT_COLLAPSE
7. **src/services/contextCollapse/persist.ts** — 会话恢复
8. **src/services/compact/snipProjection.ts** — feature: HISTORY_SNIP
9. **src/skills/mcpSkills.ts** — feature: MCP_SKILLS
10. **src/services/skillSearch/signals.ts** — 技能搜索

### 低优先级（feature-gated，单引用或少使用）
11. — 25. 其余所有 stub（主要在 feature flag 保护下，运行时不会被调用）

## 未消除的错误

所有 75 个 "Cannot find module" 错误已全部消除。剩余的 204 个 TS 错误属于其他类型：
- `TS2322: Type 'X' is not assignable to type 'Y'`
- `TS2339: Property 'X' does not exist on type 'Y'`
- `TS2304: Cannot find name 'X'`
- `TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'`
- 等

这些将在后续阶段（Phase 2+）中逐步处理。
