# 社区代码遗留 TypeScript 问题

> 本文档记录 CC_Pure 项目中来自社区引入的 TypeScript 类型问题。
> 按照 CCP 策略：社区代码问题不自行修复，等待上游 CCB 社区修复后 cherry-pick。
> 最后更新：2026-06-08

## 1. tsc 错误（实际 21 个）

### bridge.ts — ACP SDK 类型（14 个）

**文件：** `src/services/acp/bridge.ts`

核心问题：`nextSdkMessageOrAbort()` 返回类型为 `void | SDKMessage`，但代码中没有对 `void` 做类型守卫，直接访问 `SDKMessage` 的属性导致 TS 报错。原因是社区引入的 ACP SDK 适配器未处理 Generator 返回的空值情况。

| 行号 | 错误代码 | 错误信息 | 说明 |
|------|----------|----------|------|
| 649 | TS2339 | Property 'type' does not exist on type 'void \| SDKMessage' | `msg.type` — msg 可能为 void，未做守卫 |
| 654 | TS2339 | Property 'subtype' does not exist on type 'void \| SDKMessage' | `msg.subtype` — 同上 |
| 682 | TS2339 | Property 'usage' does not exist on type 'void \| SDKMessage' | `msg.usage` — 同上 |
| 700 | TS2339 | Property 'modelUsage' does not exist on type 'void \| SDKMessage' | `msg.modelUsage` — 同上 |
| 719 | TS2339 | Property 'total_cost_usd' does not exist on type 'void \| SDKMessage' | `msg.total_cost_usd` — 同上 |
| 734 | TS2339 | Property 'subtype' does not exist on type 'void \| SDKMessage' | `msg.subtype` — result 分支再次出现 |
| 735 | TS2339 | Property 'is_error' does not exist on type 'void \| SDKMessage' | `msg.is_error` — 同上 |
| 744 | TS2339 | Property 'stop_reason' does not exist on type 'void \| SDKMessage' | `msg.stop_reason` — 同上 |
| 755 | TS2339 | Property 'stop_reason' does not exist on type 'void \| SDKMessage' | `msg.stop_reason` — error_during_execution 分支 |
| 780 | TS2345 | Argument of type 'void \| SDKMessage' is not assignable to parameter of type 'SDKMessage' | `streamEventToAcpNotifications(msg, ...)` — 传递给需要 SDKMessage 的函数 |
| 800 | TS2339 | Property 'message' does not exist on type 'void \| SDKMessage' | `msg.message` — assistant 分支 |
| 803 | TS2339 | Property 'parent_tool_use_id' does not exist on type 'void \| SDKMessage' | `msg.parent_tool_use_id` — 同上 |
| 825 | TS2345 | Argument of type 'void \| SDKMessage' is not assignable to parameter of type 'SDKMessage' | `assistantMessageToAcpNotifications(msg, ...)` — 同上 |
| 850 | TS2339 | Property 'data' does not exist on type 'void \| SDKMessage' | `msg.data` — progress 分支 |

### autofix-pr — RemoteAgentPreconditionResult 类型（2 个）

**文件：** `src/commands/autofix-pr/launchAutofixPr.ts`

| 行号 | 错误代码 | 错误信息 | 说明 |
|------|----------|----------|------|
| 237 | TS2339 | Property 'errors' does not exist on type '{ eligible: true; }' | `eligibility.errors` — 社区代码对 `checkRemoteAgentEligibility` 的返回类型判别式假设不准确，eligible 为 true 的分支上没有 errors 属性 |
| 321 | TS2353 | Object literal may only specify known properties, and 'source' does not exist in type '...' | `teleportToRemote` 参数中传入 `source: 'autofix_pr'` — 该属性不在社区定义的类型中，社区代码新增了 source 字段但未更新类型定义 |

### 测试文件 — 类型守卫不完整（4 个）

**文件：** `src/commands/issue/__tests__/issue-gh.test.ts` 和 `src/commands/share/__tests__/share-gh.test.ts`

| 文件 | 行号 | 错误代码 | 错误信息 | 说明 |
|------|------|----------|----------|------|
| issue-gh.test.ts | 224:25 | TS2339 | Property 'msg' does not exist on type '{ ok: true; stdout: string; } \| { ok: false; msg: string; }' | 在 `b.ok` 为 false 的分支访问 `b.msg`，但 TS 判别式收窄后认为 b 可能是 `{ ok: true }` 类型 |
| issue-gh.test.ts | 224:37 | TS2339 | Property 'msg' does not exist on type '{ ok: true; stdout: string; } \| { ok: false; msg: string; }' | 同上，`b.msg` 第二次引用 |
| share-gh.test.ts | 216:25 | TS2339 | Property 'msg' does not exist on type '{ ok: true; stdout: string; } \| { ok: false; msg: string; }' | 同上，share-gh 测试的等价代码 |
| share-gh.test.ts | 216:37 | TS2339 | Property 'msg' does not exist on type '{ ok: true; stdout: string; } \| { ok: false; msg: string; }' | 同上，`b.msg` 第二次引用 |

### client.ts — GoogleAuth 泛型兼容（1 个）

**文件：** `src/services/api/client.ts`

| 行号 | 错误代码 | 错误信息 | 说明 |
|------|----------|----------|------|
| 297 | TS2322 | Type 'GoogleAuth\<AuthClient\>' is not assignable to type 'GoogleAuth\<JSONClient\>' | Vertex AI 的 GoogleAuth 泛型参数不兼容，#private 成员不一致，使用 `as unknown as GoogleAuth` 绕过 |

---

## 2. as any 遗留（49 个）

### API Provider 适配器（31 个）

社区后加的 multi-provider 支持。三个 provider 文件（openai、grok、gemini）均使用 `as any` 绕过流式事件类型的强类型约束。事件来自 `adaptOpenAIStreamToAnthropic()` / `adaptGrokStreamToAnthropic()` 等适配器，返回类型为 `BetaRawMessageStreamEvent`，但社区直接在 switch 中通过 `(event as any)` 访问下游属性。

#### openai/index.ts（14 处）

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 308 | `(client.chat.completions.create as any)` | 强制转换 OpenAI 客户端方法以绕过类型签名 |
| 333 | `(event as any).message` | 流事件 message_start 中提取 message |
| 335 | `(event as any).message?.usage` | 访问 usage 统计 |
| 338 | `(event as any).message.usage` | 展开 usage 对象 |
| 344 | `(event as any).index` | content_block_start 中提取块索引 |
| 345 | `(event as any).content_block` | 提取内容块 |
| 358 | `(event as any).index` | content_block_delta 中提取块索引 |
| 359 | `(event as any).delta` | 提取 delta 增量 |
| 378 | `(event as any).usage` | message_delta 中提取 usage 增量 |
| 382 | `(event as any).delta?.stop_reason` | 检查 stop_reason |
| 383 | `(event as any).delta.stop_reason` | 提取 stop_reason |
| 404 | `usage as any` | 传入 calculateUSDCost |
| 405 | `usage as any` | 传入 addToTotalSessionCost |
| 455 | `error as any` | 包装 API 错误对象 |

#### grok/index.ts（11 处）

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 118 | `(event as any).message` | 流事件 message_start 中提取 message |
| 120 | `(event as any).message?.usage` | 访问 usage |
| 121 | `(event as any).message.usage` | 展开 usage |
| 126 | `(event as any).index` | content_block_start 块索引 |
| 127 | `(event as any).content_block` | 内容块 |
| 140 | `(event as any).index` | content_block_delta 块索引 |
| 141 | `(event as any).delta` | delta 增量 |
| 156 | `(event as any).index` | content_block_stop 块索引 |
| 175 | `(event as any).usage` | message_delta usage |
| 186 | `usage as any` | 传入 calculateUSDCost |
| 187 | `usage as any` | 传入 addToTotalSessionCost |

#### gemini/index.ts（6 处）

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 124 | `(event as any).message` | 流事件 message_start 中提取 message |
| 128 | `(event as any).index` | content_block_start 块索引 |
| 129 | `(event as any).content_block` | 内容块 |
| 142 | `(event as any).index` | content_block_delta 块索引 |
| 143 | `(event as any).delta` | delta 增量 |
| 163 | `(event as any).index` | content_block_stop 块索引 |

### 生成代码 — protobuf 自动生成（7 个）

protobuf 代码生成器输出，`google.protobuf.Any` → TypeScript `any` 映射。文件在 `src/types/generated/` 下。全部为 `.create()` 方法中 `base ?? ({} as any)` 模式——空对象兜底需要用 `as any` 因为泛型约束不允许直接传空对象。

| 文件 | 行号 | 表达式 | 说明 |
|------|------|--------|------|
| `.../claude_code/v1/claude_code_internal_event.ts` | 168 | `{} as any` | GitHubActionsMetadata.create() 空对象兜底 |
| `.../claude_code/v1/claude_code_internal_event.ts` | 442 | `{} as any` | EnvironmentMetadata.create() 空对象兜底 |
| `.../claude_code/v1/claude_code_internal_event.ts` | 538 | `{} as any` | SlackContext.create() 空对象兜底 |
| `.../claude_code/v1/claude_code_internal_event.ts` | 766 | `{} as any` | ClaudeCodeInternalEvent.create() 空对象兜底 |
| `.../google/protobuf/timestamp.ts` | 140 | `{} as any` | Timestamp.create() 空对象兜底 |
| `.../growthbook/v1/growthbook_experiment_event.ts` | 147 | `{} as any` | GrowthbookExperimentEvent.create() 空对象兜底 |
| `.../common/v1/auth.ts` | 52 | `{} as any` | PublicApiAuth.create() 空对象兜底 |

### MCP/cli 社区代码（5 个）

#### ccrClient.ts — CCR 远程客户端传输层（3 处）

**文件：** `src/cli/transports/ccrClient.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 384 | `(result as any).retryAfterMs` | 事件上传失败时从 `result` 提取重试延迟（`result` 类型未定义 `retryAfterMs`） |
| 407 | `(result as any).retryAfterMs` | internal 事件上传失败重试延迟 |
| 438 | `(result as any).retryAfterMs` | delivery 事件上传失败重试延迟 |

#### structuredIO.ts — CLI 结构化 I/O（1 处）

**文件：** `src/cli/structuredIO.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 701 | `input as any` | hook callback 输入强制转换，调用方类型不匹配接收方期待的形状 |

#### useManageMCPConnections.ts（1 处）

**文件：** `src/services/mcp/useManageMCPConnections.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 527 | `origin: { kind: 'channel', server: client.name } as any` | 拼装 enqueue 的 origin 字段时强制转换 object literal |

### 其他社区代码（6 个）

#### relay.ts — CCR upstreamproxy WebSocket（3 处）

**文件：** `src/upstreamproxy/relay.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 384 | `ws.send(encodeChunk(...) as any)` | WebSocket 连接建立时发送 CONNECT + Proxy-Authorization 头部，`encodeChunk` 返回值与 `ws.send()` 参数类型不兼容 |
| 432 | `ws.send(encodeChunk(...) as any)` | 发送 keepalive 空 chunk |
| 440 | `ws.send(encodeChunk(...) as any)` | 转发 TCP 数据到 WebSocket，分片发送 |

#### streamAdapter.ts — OpenAI 流适配器（2 处）

**文件：** `src/services/api/openai/streamAdapter.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 80 | `(chunk.usage as any).prompt_tokens_details?.cached_tokens` | OpenAI chunk 的 usage 结构体不包含 `prompt_tokens_details`（仅在部分模型中存在），通过 as any 访问 cached_tokens |
| 123 | `(delta as any).reasoning_content` | DeepSeek 模型的 `reasoning_content` 字段非标准 OpenAI 协议字段，通过 as any 访问 |

#### branch.ts — branch 命令（1 处）

**文件：** `src/commands/branch/branch.ts`

| 行号 | 表达式 | 说明 |
|------|--------|------|
| 41 | `(firstUserMessage as any)?.message?.content` | 从 SerializedMessage 中提取首条用户消息的 content 字段，类型定义未覆盖嵌套 message 结构 |
