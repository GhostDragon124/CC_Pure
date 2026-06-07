# 上游同步追踪

> CC_Pure（CCP）与上游 CCB（claude-code-best）之间的版本对齐、合并历史、遗留问题和策略。
> 最后更新：2026-06-08

---

## 版本对齐信息

| 项目 | 版本 | 最新 Commit | 分支 |
|------|------|-------------|------|
| **CC_Pure (CCP)** | v2.6.11 | `328ab1ee` | `acp` |
| **上游 CCB** | v2.6.11 | `6b205f57` | `upstream/main` |
| **ccb-upstream (本地镜像)** | — | — | `ccb-upstream/main` |

### 同步时间线

| 阶段 | 日期 | CCP 版本 | 上游版本 | 说明 |
|------|------|----------|----------|------|
| 初始基线 | 2026-05-22 | v2.6.5 | v2.6.5 | CCP 从 CCB fork，建立独立分支 `acp` |
| 早期 cherry-pick | 2026-04~05 | v2.6.5→v2.6.8 | v2.6.5 | 逐个拣选上游修复和特性 |
| Phase 2 monorepo 对齐 | 2026-06-01~03 | v2.6.8→v2.6.10 | v2.6.5 | 删除 `/src/tools/`，改用 `packages/builtin-tools/` |
| 2.6.11 批量同步 | 2026-06-06~07 | v2.6.10→v2.6.11 | v2.6.11 | 批量合并 2.6.5→2.6.11 上游改动 |
| tsc 清零冲刺 | 2026-06-07 | v2.6.11 | v2.6.11 | 修复可修复类型错误，遗留社区代码问题 |

acp 分支与 upstream/main 在 `src/` 下有 **316 个 commit** 的分叉差异。

---

## 上游合并历史（按时间倒序）

### 2.6.11 同步批次（2026-06-06 ~ 06-07）

这是 CCP 的主要上游合并动作，将 2.6.5→2.6.11 的上游改动批量合入。

| Commit | 日期 | 描述 | 来源（上游） | 冲突处理 |
|--------|------|------|-------------|---------|
| `3013b051` | 06-07 | fix: add resetAbortController/getAbortSignal to QueryEngine | CCB upstream | 无冲突 |
| `00a0c86c` | 06-07 | docs: add devlog for upstream sync 2.6.5→2.6.11 | — | — |
| `930aecec` | 06-07 | chore: align acp with upstream | 多 commit | 无冲突 |
| `e3908ab4` | 06-07 | chore: align remote control web ui with upstream | 多 commit | 无冲突 |
| `b21ed050` | 06-07 | chore: sync providers.ts (Grok), Config.tsx, poorMode.ts | 多 commit | 手动合入 |
| `d04846f5` | 06-06 | checkpoint — restore 40+ upstream files, fix 21 syntax errors | 批量 | 修复 21 个语法错误 |
| `be722795` | 06-06 | chore: merge fcbc8822 — remove 113 unused imports | `fcbc8822` | 自动合并 |
| `3013db2d` | 06-06 | chore: merge upstream cleanup — 536 stubs + 17 dead files + 4 as any fixes | 批量 | 手动，处理大量删文件冲突 |
| `2020a84b` | 06-06 | feat: port mode system with 6 AI personality presets | `9947ae75` | 手动拣选，CCP 已有修改做适配 |
| `16712e03` | 06-07 | fix: eliminate 8 as any in MCP handlers | 自研（非上游） | — |

### Phase 2 — Monorepo 工具对齐（2026-06-01 ~ 06-03）

将 CCP 的扁平 `/src/tools/` 结构迁移到上游的 `packages/builtin-tools/` monorepo。

| Commit | 日期 | 描述 | 说明 |
|--------|------|------|------|
| `bdfff8de` | 06-03 | Phase 2: delete src/tools/ — align with upstream monorepo | 删除旧扁平工具目录 |
| `638affff` | 06-03 | Phase 2b Batch 3: merge AgentTool(38) drift files | 38 个 AgentTool 差异文件 |
| `46b2b0bf` | 06-03 | Phase 2b Batch 2: merge BashTool(23) + FileEditTool(13) + FileWriteTool(5) | 批量合并工具差异 |
| `0c01c93e` | 06-03 | Phase 2a: mechanical dedup — import rewrite to canonical package | 机械重写 import 路径 |
| `a8c5fd95` | 06-03 | fix: revert AgentTool prompt.ts to upstream fork terminology | 术语回退 |
| `05fd5e14` | 06-03 | fix: restore /dev/tcp /dev/udp network device redirect security check | 网络安全检查恢复 |
| `39ba9a56` | 06-01 | feat: pull in Vite build system + complete packages/builtin-tools/ | Vite 构建系统引入 |
| `ed197502` | 06-01 | fix: resolve tsc errors (remaining upstream type fixes) | 上游类型修复 |
| `d70de466` | 06-01 | fix: resolve tsc errors (upstream type cleanup batch) | 上游类型清理批次 |

### 中间 Cherry-Pick 批次（2026-05-22 ~ 06-04）

从上游拣选的独立修复和特性。

| Commit | 日期 | 描述 | 来源（上游） | 冲突处理 |
|--------|------|------|-------------|---------|
| `cdd62520` | 06-02 | feat(upstream): sync b1c4f40f ACP fix + WorkflowTool | `b1c4f40f` | 无冲突 |
| `a9e1a1e4` | 06-02 | feat: merge 4 upstream improvements (effort + sideQuery + agent hints + plan/paste) | 4 commits | 手动合并 |
| `289fc9bf` | 06-02 | fix: sync multiStore.ts and localValidate.ts from upstream | 上游 | 无冲突 |
| `5b0c0fa4` | 06-02 | fix: sync missing test mocks and agentToolFilter from upstream | 上游 | 无冲突 |
| `d1d74d4a` | 06-02 | fix: restore notifyAutomationStateChanged + skip 4 unfixable tests | 上游 | 手动 |
| `8c9efedd` | 06-02 | fix: resolve 8 test failures across 6 files | 多文件 | — |
| `80a88286` | 06-04 | fix: backfill upstream OpenAI fixes | `c82f5994`, `901628b4` | 无冲突 |
| `b5bcbdbd` | 06-04 | fix: 修复斜杠命令自动补全 | `ad09f38f` | 无冲突 |
| `10dfcc67` | 06-04 | fix: Batch 1a — WebFetchTool 安全加固 + 核心运行时修复 | `c2ac9a74` | 无冲突 |
| `8485589c` | 06-04 | fix: add typeof TungstenPill guard (partial cherry-pick) | `a02a9fc` | 部分拣选 |
| `be767204` | 06-04 | fix: RemoteTriggerTool 测试补充 mock，对齐上游 | `a2cfaf9` | 无冲突 |
| `379335e3` | 06-04 | feat: add provider-aware model name resolution | `771e3db` + `f7f69b7` | 无冲突 |
| `dc71add9` | 06-04 | feat: register LocalMemoryRecallTool + VaultHttpFetchTool | `5bb0306` | 无冲突 |
| `aa72a8ed` | 04-23 | fix: 修复 model alias 导致无限递归栈溢出 | `cee62bc` | 无冲突 |
| `e0382ce2` | 06-07 | chore: bump version to 2.6.11 | — | — |
| `2ea37816` | 06-04 | fix: restore CCP version 2.6.5 (overwritten by cherry-pick) | — | — |
| `a308aa8f` | 06-04 | fix: add missing FILE_WRITE_TOOL_NAME import + poorMode stub | 回归修复 | — |
| `03975066` | 05-01 | chore: merge 4 upstream commits (Grok, OpenAI image, CodeRabbit, tsc) | 4 commits | 无冲突 |

### 早期独立同步（2026-04 ~ 05）

| Commit | 日期 | 描述 | 说明 |
|--------|------|------|------|
| `f1c7f7dc` | 06-04 | feat: full merge of f2e9af49 autonomy PR #386 | 上游 autonomy 大 PR |
| `9538ebd2` | 06-04 | feat: full merge of f2e9af49 autonomy PR #386 | 同上（双分支） |
| `edae3a7d` | 04-29 | feat: harden autonomy lifecycle, OOM bounds | 上游 PR #386 |
| `f2e9af49` | 04-29 | feat: harden autonomy lifecycle, OOM bounds | 上游原始 commit |
| `c4e9efb7` | 05-06 | Merge pull request #417 (sync/mcp-transform-2.1.128) | PR #417 |

### acp ↔ main 同步

| Commit | 日期 | 描述 | 说明 |
|--------|------|------|------|
| `ae932e11` | 06-05 | merge: acp → main (14 test failures → 0) | 主线合并 |
| `da2d3c93` | 06-05 | merge: sync acp → main (CI baseline 7→14) | 同步 |
| `580bcfa5` | 06-04 | merge: bring main (ccp-core baseline) into acp | 基线对齐 |
| `2c27fd80` | 06-05 | fix: update CI test baseline from 7 to 14 | 基线更新 |
| `d3566259` | 06-05 | docs: 同步合并统计 | — |

---

## 当前遗留问题

### 1. tsc 错误（21 个）— 全部来自社区代码

来源：[docs/community-code-issues.md](./community-code-issues.md)

#### bridge.ts — ACP SDK 类型（14 个）

文件：`src/services/acp/bridge.ts`

核心问题：`nextSdkMessageOrAbort()` 返回 `void | SDKMessage`，代码未做 void 守卫直接访问属性。

| 行号 | 错误 | 说明 |
|------|------|------|
| 649 | `Property 'type' does not exist on type 'void \| SDKMessage'` | `msg.type` — msg 可能为 void |
| 654 | `Property 'subtype' does not exist...` | `msg.subtype` |
| 682 | `Property 'usage' does not exist...` | `msg.usage` |
| 700 | `Property 'modelUsage' does not exist...` | `msg.modelUsage` |
| 719 | `Property 'total_cost_usd' does not exist...` | `msg.total_cost_usd` |
| 734 | `Property 'subtype' does not exist...` | result 分支 |
| 735 | `Property 'is_error' does not exist...` | result 分支 |
| 744 | `Property 'stop_reason' does not exist...` | stop_reason 分支 |
| 755 | `Property 'stop_reason' does not exist...` | error_during_execution 分支 |
| 780 | `Argument of type 'void \| SDKMessage'...` | streamEventToAcpNotifications() |
| 800 | `Property 'message' does not exist...` | assistant 分支 |
| 803 | `Property 'parent_tool_use_id' does not exist...` | assistant 分支 |
| 825 | `Argument of type 'void \| SDKMessage'...` | assistantMessageToAcpNotifications() |
| 850 | `Property 'data' does not exist...` | progress 分支 |

#### autofix-pr（2 个）

文件：`src/commands/autofix-pr/launchAutofixPr.ts`

| 行号 | 错误 | 说明 |
|------|------|------|
| 237 | `Property 'errors' does not exist on type '{ eligible: true; }'` | `eligibility.errors` — 判别式不准确 |
| 321 | `Property 'source' does not exist in type '...'` | `teleportToRemote` 传入 `source: 'autofix_pr'` |

#### 测试文件（4 个）

| 文件 | 行号 | 错误 | 说明 |
|------|------|------|------|
| `issue-gh.test.ts` | 224:25 | `Property 'msg' does not exist...` | `b.msg` — 判别式收窄问题 |
| `issue-gh.test.ts` | 224:37 | `Property 'msg' does not exist...` | 同上 |
| `share-gh.test.ts` | 216:25 | `Property 'msg' does not exist...` | 同上 |
| `share-gh.test.ts` | 216:37 | `Property 'msg' does not exist...` | 同上 |

#### client.ts — GoogleAuth 泛型（1 个）

| 行号 | 错误 | 说明 |
|------|------|------|
| 297 | `Type 'GoogleAuth<AuthClient>' is not assignable to 'GoogleAuth<JSONClient>'` | Vertex AI GoogleAuth 泛型参数不兼容，`as unknown as GoogleAuth` 绕过 |

### 2. as any 遗留（49 个）

#### API Provider 适配器（31 个）

| 文件 | 数量 | 范围 |
|------|------|------|
| `openai/index.ts` | 14 | 流事件适配、usage 提取、错误包装 |
| `grok/index.ts` | 11 | 流事件适配、usage 提取 |
| `gemini/index.ts` | 6 | 流事件适配 |

#### 生成代码 — protobuf 自动生成（7 个）

| 文件 | 数量 | 模式 |
|------|------|------|
| `claude_code_internal_event.ts` | 4 | `{} as any` — `.create()` 空对象兜底 |
| `timestamp.ts` | 1 | `{} as any` |
| `growthbook_experiment_event.ts` | 1 | `{} as any` |
| `auth.ts` | 1 | `{} as any` |

#### MCP/cli 社区代码（5 个）

| 文件 | 数量 | 说明 |
|------|------|------|
| `ccrClient.ts` | 3 | `(result as any).retryAfterMs` — 重试延迟提取 |
| `structuredIO.ts` | 1 | `input as any` — hook callback 输入强制转换 |
| `useManageMCPConnections.ts` | 1 | `origin: {...} as any` — origin 字段强制转换 |

#### 其他社区代码（6 个）

| 文件 | 数量 | 说明 |
|------|------|------|
| `relay.ts` | 3 | `ws.send(encodeChunk(...) as any)` — WebSocket 类型不兼容 |
| `streamAdapter.ts` | 2 | `(chunk.usage as any).prompt_tokens_details` / `(delta as any).reasoning_content` |
| `branch.ts` | 1 | `(firstUserMessage as any)?.message?.content` |

### 3. client.ts googleAuth as any

已在上方 tsc 错误部分记录。这是社区代码引入的 Vertex AI GoogleAuth 泛型不兼容问题。

---

## 未来 Cherry-Pick 策略

### 1. 如何监控上游新 commit

```bash
# 定期拉取上游
git fetch upstream

# 查看上游未合入的 commit（相对于 acp）
git log upstream/main..acp --oneline --since="2026-06-07"

# 查看上游新 commit
git log acp..upstream/main --oneline
```

建议：
- **每日** `git fetch upstream` + 检查新 commit 列表
- 关注上游的 `chore: 2.6.x` tag commits（版本发布标记）
- 关注 PR 中的 `fix:` / `security:` 前缀 commit
- 特别关注涉及 ACP、Bridge、MCP 协议层的修复

### 2. Cherry-Pick 流程

```
1. git fetch upstream
2. git checkout acp
3. git log acp..upstream/main --oneline  # 查看待合入 commit
4. 评估优先级（见下方第 4 节）
5. git cherry-pick -x <commit-hash>
6. 解决冲突（见下方第 3 节）
7. bun run check     # lint + format
8. bunx tsc --noEmit # 类型检查
9. bun test          # 测试
10. git commit --amend -m "fix: ... (cherry-pick <upstream-hash>)"
11. git push origin acp
```

### 3. 冲突处理原则

| 情况 | 处理方式 |
|------|----------|
| **CCP 特有文件**（telemetry、skill、acp bridge 等） | 以上游为准，手动适配 CCP 修改 |
| **纯新增文件** | 直接接受，无冲突 |
| **已删除的 CCP 文件**（如旧 `/src/tools/`） | 上游修改跳过 |
| **双方修改的同一行** | 手动判断：功能性以上游为准，CCP 定制部分保留 |
| **import 路径差异**（CCP 用 canonical package vs 上游用 direct import） | 按 CCP monorepo 规则重写 import |
| **测试文件冲突** | 视情况：上游测试修复优先合入；CCP 独有测试保留 |

**通用原则：**
- 功能性修复 > 代码风格改动
- 上游 tsc 修复优先合入（可降低 CCP tsc 计数）
- 涉及安全/隐私的 commit 必须立即合入
- 排除仅与 Anthropic 内部基础设施相关的 commit

### 4. 优先级分级

| 优先级 | 类别 | 说明 | 示例 |
|--------|------|------|------|
| **P0** | 安全/隐私 | 遥测泄漏修复、路径遍历修复 | 类似 `#1253` telemetry leak fix |
| **P1** | 功能性 bug 修复 | ACP 协议修复、核心运行时崩溃修复 | ACP extended thinking fix |
| **P1** | TypeScript 修复 | 减少社区 tsc 错误 | 各类 as any → 具体类型 |
| **P2** | 测试修复/改善 | 上游测试修复可提升 CI 可靠性 | mock 补充、test baseline 更新 |
| **P3** | 非功能性移植 | 新特性、重构、文档 | mode system、effort 描述调整 |
| **P4** | Anthropic 内部专用 | 遥测上传、内部 API、权限系统 | BigQuery exporter、内部 endpoints |

### 5. 值得优先合入的上游 commit 方向

- **ACP SDK 适配器修复** — 直接影响 CCP 核心 ACP 协议功能
- **TypeScript 类型增强** — reduce `as any` / 修复 tsc 错误
- **流事件处理改进** — OpenAI/Grok/Gemini provider 的流事件处理
- **安全性修复** — 防止遥测泄漏、命令注入、路径遍历
- **测试基础设施** — mock 框架、测试工具、CI 配置
- **Chrome/Computer Use MCP** — 若上游修复了相关包依赖

---

## CCP 特有改动清单

以下为 CCP 与上游的主要分叉点。**这些改动不能合入上游**（上游是公开的 Anthropic 官方案例）。

### 1. 遥测数据本地化

| 文件 | 改动 |
|------|------|
| `src/utils/telemetry/bigqueryExporter.ts` | Anthropic 遥测 endpoint 清空为 `''`，阻止数据外泄 |
| `src/utils/telemetry/instrumentation.ts` | 本地化分析链路，不向 Anthropic 发送遥测 |
| `src/utils/sinks.ts` | 本地 analytics sink（`64ca3250`） |
| `src/services/analytics/growthbook.ts` | GrowthBook 实验默认 fallback，不依赖远程配置 |

**commit：** `83abbbc2`、`64ca3250`、`8a301dcf`

### 2. 穷鬼模式（Poor Mode）移除

上游的穷鬼模式（低成本模式）已被 CCP 彻底移除。

**commit：** `987578b5`、`51ce0931`

### 3. Chrome / Computer Use MCP 恢复

上游删除的 Chrome 浏览器自动化和 Computer Use 功能，CCP 已从历史记录中恢复。

**commit：** `e2aafbb5`、`957076c5`

相关包保留在 `packages/` 下。

### 4. ACP 对齐（内部 QueryEngine）

CCP 的 `acp` 分支包含大量 ACP 协议层改动，上游 CCB 的 ACP 支持是独立的：

| commit | 说明 |
|--------|------|
| `34154ee3` | 支持 acp-link 包进行 ACP remote-control |
| `09fc515e` | 远程群控功能 |
| `2d05da10` | remote control auto bind |
| `d7195087` | ACP 协议版本 remote control |
| `6950401c` | ACP session ID 与全局会话状态对齐 |
| 多个 ACP bug fix | `01f26cf4`、`230eb489`、`a077ec8d`、`7e3d825f` |

### 5. Skill 系统替换

上游使用 `skillLearning` 子系统（Anthropic 内部分析用户行为），CCP 替换为 Hermes skill 系统。

| commit | 说明 |
|--------|------|
| `42100d62` | 关闭 skill learning 编译开关 |
| `75fa2127` | 彻底移除 skillLearning 子系统 |
| (Hermes) | 技能系统由外部 Hermes Agent 框架提供 |

### 6. 其他 CCP 特有改动

| 类别 | 说明 |
|------|------|
| **配置文件本地化** | `~/.claude/` → 本地配置，不依赖 Anthropic 云端 |
| **更新机制** | `updateCCB.ts` 被删除，替换为本地更新管理 |
| **Vite 构建系统** | `build.ts` + `vite.config.ts` 双构建管线，上游仅有 Bun build |
| **代码分割** | Vite 代码分割 600+ chunk 降低 RSS（966MB→35MB） |
| **Bridge 系统** | `src/bridge/` 包含远程控制桥接层（上游已删除） |
| **HTTP proxy 解析** | `src/utils/sensitive.ts` 敏感信息处理 |
| **ACL 访问控制** | `src/utils/processUserInput/` 中的命令处理安全加固 |
| **移除的测试文件** | `src/commands/__tests__/` 中大量上游测试被删除或 stubbed |
| **Bootstrap 差异** | `src/bootstrap/` 中的状态管理、类型定义差异 |
| **ripgrep 二进制** | vendor 二进制拷贝脚本定制 |

### diff 概要

```
git diff upstream/main..acp -- src/ | stat:
1448 files changed, 55529 insertions(+), 89243 deletions(-)
```

主要删减集中在上游的测试文件（`__tests__/`）、Claude In Chrome、Agents Platform、CCR 等 CCP 不使用的功能。

---

## 附录

### 获取上游最新状态的命令

```bash
# 拉取上游
git fetch upstream

# 查看有意义的待合入 commit（排除合并/文档）
git log acp..upstream/main --oneline --no-merges |
  grep -v "docs:\|chore:\|contributors"

# 统计分叉数量
git rev-list --count upstream/main..acp -- src/

# 查看特定文件的分叉
git diff upstream/main..acp -- <path>

# 查看 CCP 特有改动统计
git log --all --grep="cherry\|sync\|merge\|upstream" --since="2026-01-01" --oneline | wc -l
```

### 相关文档

- [社区代码遗留问题](./community-code-issues.md) — 详细的 tsc 和 as any 列表
- [Upstream Sync Devlog](./upstream-sync-devlog-2.6.5-2.6.11.md) — 2.6.5→2.6.11 同步过程记录
- [测试规范](./testing-spec.md) — 测试基线和工作流
