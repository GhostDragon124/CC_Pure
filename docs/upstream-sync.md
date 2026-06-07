# 上游同步追踪

> CC_Pure（CCP）与上游 CCB（claude-code-best）之间的版本对齐、合并历史、遗留问题和策略。
> 最后更新：2026-06-08
>
> **来源说明**：本文档合并了「上游同步记录.md」和「上游commit审查清单.md」的内容。已审查过的 commit 标注了"可直接跳过"。

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

### 合并统计

| 指标 | 数值 |
|------|------|
| 上游总 commit（post-April） | 664 个 |
| 候选 commit（过滤已合并/文档/CI） | 187 个 |
| ✅ 已合并至 CCP | **59 个**（11 P0/P1 + 23 P2 + 16 P3 + 2 REVIEW + 7 RCS/SSH） |
| 🟡 已存在（无需再次合并） | **34 个** |
| ❌ 跳过（无关/Windows/纯测试等） | **93 个** |
| ⏸️ 延后 | **1 个** |
| 可精确追溯 upstream commit 合计 | **41 个**（延 hash cherry-pick + 批次同步带入） |

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

## 上游同步详细记录

> 以下内容由「上游同步记录.md」合并而来，提供更细致的 commit 分组和上游→CCP 映射。

### 6.5 ACP 全量引入 (2026-06-04)

> 在 `acp` 分支独立维护，从上游 CCB 合并 5 个 ACP 相关 commit。

| 上游 commit | 说明 | 状态 |
|---|---|---|
| `3cb1e50b` | 添加对 ACP 协议的支持 (#284) | ✅ 提取核心文件 |
| `7881cc61` | 增强 ACP 桥接与权限处理 | ✅ Cherry-pick |
| `2c8a22d4` | fix(acp): 对齐 ACP session ID | ✅ Cherry-pick |
| `66d2671c` | feat: acp manager (#304) | ✅ 以上游 CCB 为准，覆盖本地旧版 |
| `4dcbaf1e` | fix: messageSelector require 崩溃 | ⏭️ CCP 已有同类修复 |
| `b1c4f40f` | fix: ACP extended thinking 导致 400 | ⏭️ CCP 已有同类修复 |

分支: [acp](https://github.com/GhostDragon124/CC_Pure/tree/acp) | 测试 3551 / build 586 files

### 合并统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 延原始 hash 的 cherry-pick | **8** | d4a60147, b1c4f40f, 897c186f, 6766f08e, 9d17597e, 7b52054f, 03598d3f, 48a19b8a |
| 批次同步中带入 | **10** | 02298cb1, e33b17bd, ed619327, a91653a0, a05242ce, 27b334ac, dab04af7, 6dd378bf, efc218d8, f9106083 |
| 自动合并的 upstream PR | **23** | 见下方表格 |
| 批次同步（无法 1:1 映射） | **5 批** | 39ba9a56, a9e1a1e4, cdd62520, d70de466, ed197502 |
| **P2 评估+合并 (2026-06-04)** | **23** | 3.1→3.7 逐 commit 评估 |
| **可精确追溯 upstream commit 合计** | **41** | |

### 一、批次同步（多 commit 合并）

| CCP Commit | 日期 | 说明 | 涉及文件 |
|---|---|---|---|
| `39ba9a56` | 2026-06-01 | **Vite 构建系统 + 完整 packages/builtin-tools/** | 大量文件，引入 Vite 替代 Bun build |
| `a9e1a1e4` | 2026-06-02 | **合并 4 个上游改进**：effort 模型白名单解除 + sideQuery 路由 + agent hints + plan/paste fixes | `src/utils/effort.ts`, `src/utils/sideQuery.ts`, `src/utils/model/model.ts`, `packages/@ant/model-provider/` |
| `cdd62520` | 2026-06-02 | **ACP fix b1c4f40f + WorkflowTool top-level require()** | `src/utils/messages.ts`, `scripts/defines.ts` |
| `d70de466` | 2026-06-01 | **tsc 类型修复（上游清理批次）** | `packages/@ant/computer-use-*/`, `packages/@ant/ink/`, `src/cli/handlers/mcp.tsx` |
| `ed197502` | 2026-06-01 | **tsc 类型修复（残余上游修复）** | `src/bridge/`, `src/bootstrap/state.ts`, `src/QueryEngine.ts` |

### 二、单独 Cherry-pick

#### API / 查询

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| (内置) | `02298cb1` | 2026-06-02 | **安全**：关闭 preconnectAnthropicApi 启动路径遥测泄漏 (#1253) |
| (内置) | `e33b17bd` | 2026-05-31 | **feat**：sideQuery 支持第三方 provider 路由 (OpenAI/Grok/Gemini) |
| (内置) | `ed619327` | 2026-05 | **fix**：OpenAI stream adapter 中 cached_tokens 未从 input_tokens 中减去 |

#### 工具系统

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| `98c3deb2` | `d4a60147` | 2026-05-22 | **fix**：修复 BriefTool 循环依赖导致 isBriefEnabled 未定义 |
| (内置) | `a91653a0` | 2026-06-02 | **fix**：删除 edit tool 中的旧逻辑处理 (#1251) |
| (内置) | `a05242ce` | 2026-05 | **fix**：明确告知 agent SearchExtraTools/ExecuteExtraTool 是核心工具 |
| (内置) | `27b334ac` | 2026-05 | **fix**：防止 MCP 工具调用失败后的死循环 |

#### Effort / 模型

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| `7b52054f` | 同 | 2026-05-22 | **feat**：解除 max/xhigh effort 级别的模型白名单限制 |
| `03598d3f` | 同 | 2026-05 | **refactor**：移除 resolveAppliedEffort 中的 max/xhigh 降级分支 |
| `f35fb02b` | `897c186f` | 2026-05-22 | **docs**：effort 级别描述去掉模型名限制 |

#### ACP / Bridge

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| `b1d322f7` | `b1c4f40f` | 2026-05-22 | **fix**：ACP 模式下 extended thinking + tool_use 触发连续 user 消息导致 400 (CC-1215) |

#### 构建 / 性能

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| (内置) | `dab04af7` | 2026-05 | **perf**：Vite 构建启用 code splitting，Bun RSS 从 966MB 降至 35MB |

#### GitHub 集成命令

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| `241aca1e` | `6766f08e` | 2026-05-09 | **feat**：添加 GitHub 集成命令（/issue、/share、/autofix-pr） |
| `1c802164` | `9d17597e` | 2026-05-22 | **feat**：autofix-pr 完成回流机制（latent bug fix + completionChecker + 内容回流） |

#### 其他修复

| CCP Commit | 上游 Commit | 日期 | 说明 |
|---|---|---|---|
| (内置) | `6dd378bf` | 2026-05 | **fix**：退出启动对话框时终端残留一行内容 |
| (内置) | `efc218d8` | 2026-05 | **fix**：searchSkills 使用缓存 IDF 前校验 index 引用一致性 |
| (内置) | `f9106083` | 2026-05 | **fix(swarm)**：WindowsTerminalBackend pidFile health check (#1237) |
| `48a19b8a` | 同 | 2026-05-17 | **fix**：isUsing3PServices 检查所有非 Anthropic provider (#1235) |
| `27b665ac` | 同 | 2026-05 | **Fix type** (#1242) |
| `ea399f18` | 同 | 2026-05 | **Fix type** (#1239) |
| `b67e9f9d` | 同 | 2026-05 | **Fix/plan paste fixes** (#1238) |
| `d66a6f61` | 同 | 2026-05 | **feat**：添加 /goal 命令 (#1222) |
| `2cc9a7da` | 同 | 2026-05 | **Revert**：回退 /goal 命令 (#1236) |

#### 自动合并的 PR

| CCP Commit | 日期 | 说明 |
|---|---|---|
| `0face46f` | 2026-05-14 | Merge PR #1228: fix/spinner-tree-local-agent-tokens |
| `d451e307` | 2026-05-14 | Merge PR #1226: feat/mimo-thinking-support |
| `80b46d22` | 2026-05-14 | Merge PR #1225 |
| `3d7b32f5` | 2026-05-12 | Merge PR #1117: fix/acp-session-id-alignment |
| `998890b4` | 2026-05-10 | Merge PR #446: feature/prompt-cut-down |
| `3f0f699c` | 2026-05-10 | Merge PR #445: feature/many-feature-packagee |
| `7e2b8e81` | 2026-05-09 | Merge PR #442: feature/tool_search |
| `df8c4f4b` | 2026-05-09 | Merge PR #438: feature/codex-subscription |
| `02dd7967` | 2026-05-08 | Merge PR #435: fix/conditional-hooks-ctrlo-error |
| `2fdfb844` | 2026-05-07 | Merge PR #428 |
| `c7efac6b` | 2026-05-06 | Merge PR #423: feat/statusline-refresh-interval |
| `68c7ebb2` | 2026-05-06 | Merge PR #419: codex/sub-agents-docs |
| `9e299a72` | 2026-05-06 | Merge PR #420: fix/third-party-api-user-id |
| `5c107e5f` | 2026-05-06 | Merge PR #416: feat/subagent-fork-render |
| `c4e9efb7` | 2026-05-06 | Merge PR #417: sync/mcp-transform-2.1.128 |
| `f5c9880d` | 2026-05-05 | Merge PR #413: performance/20260505/memory-leak-fix |
| `a1108870` | 2026-05-05 | Merge PR #412: feature/20260504/improve |
| `4cbf406c` | 2026-05-02 | Merge PR #403: fix/deepseek-empty-reasoning-content |
| `385baf57` | 2026-05-02 | Merge PR #402: fixture/memory-peak |
| `96f1700e` | 2026-05-02 | Merge PR #400: fixture/memory-peak |
| `cd8136f4` | 2026-04-30 | Merge PR #395: fix/theme-switching |
| `632f3e19` | 2026-04-30 | Merge PR #381 |
| `00da5d7d` | 2026-04-29 | Merge PR #388: fix/modelpicker-1m-toggle-hint |
| `edae3a7d` | 2026-04-29 | feat: harden autonomy lifecycle, OOM bounds (#386) |

### 三、基础设施同步

| CCP Commit | 日期 | 说明 | 涉及 |
|---|---|---|---|
| `5b0c0fa4` | 2026-06-02 | 同步缺失的 test mocks + agentToolFilter | `tests/mocks/` (6 个文件), `src/utils/agentToolFilter.ts` |
| `289fc9bf` | 2026-06-02 | 同步 multiStore.ts + localValidate.ts | `src/services/SessionMemory/`, `src/utils/` |
| `8c9efedd` | 2026-06-02 | 修复 8 个测试失败（6 个文件） | ExecuteTool, OpenAI stream adapter, localVault, effort, formatBriefTimestamp |
| `d1d74d4a` | 2026-06-02 | 恢复 notifyAutomationStateChanged + 跳过 4 个不可修复测试 | `src/utils/sessionState.ts`, 测试文件 |
| `d020ca4b` | 2026-05-22 | chore: 2.6.5 版本号 | `package.json` |

### 四、Autonomy 全量合并 (2026-06-04)

> 从上游 `f2e9af49` (PR #386) 完整合并 autonomy 源码 + 测试。此前 batch sync 只带了代码，遗漏了 5 处源码集成点和 11 个测试文件。

| 类别 | 文件 | 说明 |
|---|---|---|
| 源码 | `useScheduledTasks.ts` | 导出 `createScheduledTaskQueuedCommand`，autonomy 队列去重 |
| 源码 | `processUserInput.ts` | 透传 autonomy payload，暴露 `deferAutonomyCompletion` |
| 源码 | `processSlashCommand.tsx` | 接受 autonomy 参数，background fork 延迟终结 |
| 源码 | `handlePromptSubmit.ts` | 空闲队列过滤 stale autonomy 命令 |
| 源码 | `Tool.ts` | 添加 `allowBackgroundForkedSlashCommands` |
| 测试 | `autonomyAuthority.test.ts` | 权威配置解析 + prompt 组装 |
| 测试 | `autonomyFlows.test.ts` | 托管流生命周期 |
| 测试 | `autonomyPersistence.test.ts` | 文件锁 + 活跃保留 |
| 测试 | `autonomyQueueLifecycle.test.ts` | 队列分区/认领/终结 |
| 测试 | `autonomyRuns.test.ts` | 状态机 + 去重 + 格式化 |
| 测试 | `queryAutonomyProviderBoundary.test.ts` | provider 错误终结 |
| 测试 | `handlePromptSubmit.test.ts` | stale autonomy 过滤 |
| 测试 | `useScheduledTasks.test.ts` | cron → autonomy 队列 |
| 测试 | `processSlashCommand.test.ts` | slash 命令 autonomy 集成 |
| 测试 | `autonomy-lifecycle-user-flow.test.ts` | CLI 子进程集成 |
| 测试 | `RemoteTriggerTool.test.ts` | 合并上游断言改进 |

**测试：3699 pass, 0 fail** (+97 from 3602)

Tag: `v2.2.2` | Commit: `9538ebd2` (acp) / `f1c7f7dc` (main)

#### 后续同步时可跳过

```
# Autonomy (PR #386) — 全量合并
f2e9af49   # harden autonomy lifecycle, OOM bounds, provider-boundary finalization
452a7e6a   # fixup: CodeRabbit review
189766c5   # fixup: CodeRabbit second-round review
6b7cfda9   # fixup: 4 remaining review items
7a6e65ca   # refactor: simplify/reuse/defense
edae3a7d   # squashed final PR #386
a2cfaf91   # RemoteTriggerTool + autonomy test fixes
```

#### Tags

| Tag | 日期 | 说明 |
|---|---|---|
| `v0.1.0-toolsearch-fix` | 2026-06-01 | Tool Search 缓存修复 |
| `v1.6.2` | 2026-06-01 | 早期版本 |
| `v1.7.0` | 2026-06-02 | 基础设施同步 |
| `v1.8.0` | 2026-06-04 | P2 完成 (23 merged) |
| `v2.0.0` | 2026-06-04 | P3 A 完成 (12 merged) |
| `v2.1.0` | 2026-06-04 | REVIEW 24 执行完毕 (2 merged) |
| `v2.2.0` | 2026-06-04 | P3 B 完成 (3 merged) |
| `v2.2.1` | 2026-06-04 | OpenAI fixes backfill (c82f5994, 901628b4) |
| `v2.2.2` | 2026-06-04 | Autonomy 全量合并 (f2e9af49) |

### 五、RCS/Web + SSH 全量合并 (2026-06-04)

> RCS Web UI 从 vanilla JS 全面迁移到 React 架构，SSH Remote 替换 stub 为完整实现。

| CCP Commit | 上游 Commit | 说明 |
|---|---|---|
| `d1176325` | `fe08cac` | fix(remote-control): harden self-hosted session flows (#278) — RCS 安全加固 |
| `7f4dcfba` | `72a2093` | feat(remote-control): 优化 Web 展示、状态同步与桥接控制 (#288) — 64 files |
| `056231d0` | `34154ee` | feat: React Web UI 迁移 + acp-link 完善 (#292) — 142 files, vanilla JS → React |
| `d7195087` | `2e9aaf4` | feat: ACP 协议 remote control (#293) — 54 files, ACP bridge |
| `c112237e` | `f9d0111` | fix: web 端 crypto.randomUUID → uuid 库 |
| `2d05da10` | `c7bc8c8` | feat: remote control auto bind (#300) — TokenManager + auto bind |
| `1b6ae3d3` | `03811f9` | feat: SSH Remote — 本地 REPL + 远端工具执行 — 10 files, 2010 行, 17 tests |

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

### 6. 建议合并顺序

以下顺序基于 commit 审查清单中的分析，按收益/风险比排序。

#### 第一批：内存修复（P0 + P2 内存，约 12 个）

```
52b61c2 → e7220c5 → f2e9af4 → f724300 → 198c09b → ab0bbbc
→ 835dd2d → b3d28bc → ef10ad2 → f5c3ee5 → 0290fe3 → 08cd02c
```

预期效果：RSS 降低 200-500MB，消除已知泄漏点。

#### 第二批：Provider 兼容（P1，约 9 个）

```
3cf94fb → d136872 → dc3d3e8 → 771e3db → cee62bc → 047c85f
→ ecd3f9d → 941bcbd → eca1acc (OpenAI 图片兼容)
```

预期效果：DeepSeek/Gemini 调用不再报 400/403，图片粘贴可用。

#### 第三批：工具系统（约 5 个）

```
c14b7ea → e5f31af → fc8d531 → b4e52d0 → 7be08f5
```

预期效果：Tool Search 缓存正确，agent 工具链完整。

#### 第四批：体验 + 构建（余下）

```
2f86485 → 2006ab2 → b28de71 → 2934f30 → 33fe494 → ...
```

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

## 六、已审查 commit 清单（可直接跳过）

> 以下内容由「上游commit审查清单.md」合并而来。基于 2026-06-04 上游 `claude-code-best/main` (708 commits) vs CCP `main` 的 diff 分析。
>
> 初筛：664 个 post-April commit → 过滤已合并/文档/CI → **180 个候选**（后补充至 187 个）。
>
> Windows 特供的已标记 SKIP（CCP 跑 Linux）。

### 判定标准

| 标记 | 含义 | 说明 |
|------|------|------|
| ✅ MERGE | 推荐合并 | 有明确收益，已实际合并 |
| 🟡 EXISTS | 已存在 | 前期批次已自动带入，无需再次合并 |
| ❌ SKIP | 不合并 | 与 CCP 无关/低价值/Windows 特供/已覆盖 |
| ⏸️ 延后 | 暂缓合并 | 待条件满足时再合 |

### 统计概览

| 类别 | 总数 | ✅ 已合并 | 🟡 已存在 | ❌ 跳过 | ⏸️ 延后 |
|------|------|----------|----------|---------|---------|
| P0 高优先级 | 8 | 5 | 2 | 1 | 0 |
| P1 建议合并 | 9 | 6 | 2 | 1 | 0 |
| **P0+P1 合计** | **17** | **11** | **4** | **2** | **0** |
| P2 (3.1-3.7) | 53 | 23 | 13 | 17 | 0 |
| P3 低优先级 | 106 | 16 | 14 | 76 | 0 |
| REVIEW | 24 | 2 | 3 | 18 | 1 |
| RCS/Web 全量 | 6 | 6 | 0 | 0 | 0 |
| SSH Remote | 1 | 1 | 0 | 0 | 0 |
| **全量总计** | **187** | **59** | **34** | **93** | **1** |

> 额外标注：skill learning 全家桶（6 个 commit）已确认不合并——上游自己都注释掉了 `SKILL_LEARNING`，功能未成熟。

### 已合并 commit 列表（59 个）

#### P0 — 高优先级（5 个）

| # | 上游 Commit | 说明 | CCP Commit |
|---|-----------|------|-----------|
| 1 | `f2e9af4` | feat: harden autonomy lifecycle, OOM bounds | `9538ebd2` (acp) / `f1c7f7dc` (main) |
| 2 | `3cf94fb` | fix: 修复对穷鬼模式的 auto dream 和 session memory 越过 | `51ce0931` |
| 3 | `5bb0306` | feat: 添加 LocalMemoryRecallTool 和 VaultHttpFetchTool | `dc71add9` |
| 4 | `a2ea69c` | feat: 添加 Session Memory 多存储支持 | `95482ce7` |

#### P1 — 建议合并（6 个）

| # | 上游 Commit | 说明 | CCP Commit |
|---|-----------|------|-----------|
| 5 | `f724300` | fix: FileReadTool 100KB 上限、lookups 缓存、microcompact | `b8dec7f7` (Codex) |
| 6 | `2f86485` | refactor: 精简系统提示词 | `3b38767c` |
| 7 | `bdea5a2` | fix: Fix deferred tools handling in OpenAI compatibility layer | `70d6b288` |
| 8 | `e88dcb2` | fix: OpenAI adapter tool calling compatibility | `a442aee5` |
| 9 | `b28de71` | perf: 优化内存与遥测管理，启用 Vite minify | `db84f971` (Codex) |
| 10 | `4f0aa86` | feat: 添加本地 Memory/Vault 管理命令 | `a3ef9a1b` |

#### P2 — 逐 commit 评估（23 个）

##### 3.1 内存/性能（5 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `198c09b` | 内存优化 — 预测性 compact 阈值、增量 lookups orphaned 修复 | `aff7b0e8` |
| `ef10ad2` | 优化内存峰值与 CPU 性能，降低 100-300MB | `b7bbbeb0` |
| `f5c3ee5` | 修复长时间运行会话的内存泄漏问题 | `39a3ff8d` |
| `3a2b6dd` | 表格渲染效率升级 | `b4629aa5` |
| `08cd02c` | highlight 缓存改用 LRUCache 降低内存开销 | `d35f0db1` |

##### 3.2 Provider/API 兼容（6 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `d136872` | 修复第三方 API 不兼容部分参数 | `72b13ee2` |
| `dc3d3e8` | 移除 auto mode 的 provider 和模型白名单限制 | `90406a10` |
| `771e3db` | 修复非 Anthropic provider 署名模型名获取错误 | `379335e3` |
| `6f80e96` | modelType 优先于所有 env vars | `ef80d21d` |
| `462fe69` | 修复 OpenAI cost 计算问题 | `f484c9fa` |
| `cee62bc` | 修复 model alias 导致无限递归栈溢出 | `aa72a8ed` |

##### 3.3 工具系统（3 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `c14b7ea` | 修复 Tool Search 缓存失效 | `eaa6199f` |
| `fc8d531` | ExecuteExtraTool 加入子代理允许列表 | `3922ce07` |
| `ba74e09` | fork-agent-redesign — AgentTool fork 参数 | `e1e23787` |

##### 3.4 系统提示词 / UX（4 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `84f12f3` | 提升 CLAUDE.md 指令权重 | `35927b20` |
| `2006ab2` | 添加 React Error Boundary 防止渲染崩溃 | `1d3951d4` |
| `1f80043` | 修复子代理 token 消耗显示为 0 | `4e050df9` |
| `e7070e0` | showSpinnerTree 下保留 local-agent token | `cbe32ea5` |

##### 3.6 会话/Bridge（2 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `eb833da` | 创建 agent 后刷新缓存 | `44bfc189` |
| `a2cfaf9` | RemoteTriggerTool 测试 mock 补全（部分） | `be767204` |

##### 3.7 杂项（3 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `c499bfb` | 修复 voice provider 的问题 | `1dfe9093` |
| `6c5df39` | 添加 compact 缓存与上下文压缩增强 | `6a63706b` |

#### P3 — 低优先级已合并（16 个）

| # | 上游 Commit | 说明 | CCP Commit |
|---|-----------|------|-----------|
| 71 | `ecd3f9d` | fix: Gemini 适配器补全 usage 字段映射 | 🟡 空提交 — 已存在 |
| 80 | `82be5ff` | fix: 代码审查修复 — 安全、性能和正确性 | `fe9da6e5` (partial) |
| 89 | `26ddbda` | fix: align mcp transform pipeline with Anthropic 2.1.128 | `5ebd5466` |
| 90 | `3f1c846` | fix: 调小 snapshots 的范围 | `5886421a` |
| 91 | `75952bd` | fix: 尝试请求参数克隆以解除闭包引用 | `9d49306b` |
| 115 | `047c85f` | fix: 修复 DeepSeek V4 reasoning_content 回传导致 400 | `3cc9545d` |
| 116 | `da6d063` | fix: 修复 anthropic 四个 bug (#352) | `995d3a47` (partial) |
| 117 | `4dcbaf1` | fix: 修复 ACP 模式下 messageSelector require 失败 | `6a025582` |
| 119 | `299953b` | fix: 修复 cliHighlight 类型不兼容问题 | `5ed0fa57` |
| 130 | `c5ab83a` | fix: 修复 Linux 端的安装问题 | `2074f646` |
| 133 | `8442aaa` | fix: 修复 n 快捷键导致关闭的问题 | `6362f1af` |
| 147 | `bb07836` | fix: support CRLF SSE frame parsing (#223) | `d0278e89` |
| 155 | `70baa6f` | feat: add Grok (xAI) API adapter | acp 分支合并 |
| 159 | `eca1acc` | feat: 支持 OpenAI 图片兼容 | acp 分支合并 |
| 169 | `a02a9fc` | fix: 修复定义导入缺失 | `8485589c` (partial) |
| 80 dup | `1d38eae` | fix: address CodeRabbit review findings | acp 分支合并 |

#### REVIEW — 最终判定（2 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `e8759f3` | 禁用 opus[1m] 自动迁移，尊重用户手动移除 [1m] 后缀 | `4ceeedee` |
| `86df024` | 修复模型相关问题 | `9df9e037` |

#### RCS/Web + SSH（7 个）

| 上游 Commit | 说明 | CCP Commit |
|-----------|------|-----------|
| `fe08cac` | fix(remote-control): harden self-hosted session flows (#278) | `d1176325` |
| `72a2093` | feat(remote-control): 优化 Web 展示、状态同步 (#288) | `7f4dcfba` |
| `34154ee` | feat: React Web UI 迁移 (142 files) | `056231d0` |
| `2e9aaf4` | feat: ACP 协议 remote control (54 files) | `d7195087` |
| `f9d0111` | fix: web 端 crypto.randomUUID → uuid 库 | `c112237e` |
| `c7bc8c8` | feat: remote control auto bind (#300) | `2d05da10` |
| `03811f9` | feat: SSH Remote — 本地 REPL + 远端工具执行 | `1b6ae3d3` |

### 已存在 commit 列表（34 个）

这些 commit 在前期批次同步或自动合并中已带入 CCP，再次 cherry-pick 会产生冲突或无变化。

| # | 上游 Commit | 说明 | 来源 |
|---|-----------|------|------|
| 2 | `e7220c5` | fix: eliminate memory leak in promptCacheBreakDetection | 批次同步带入 |
| 5 | `4b44047` | fix: prevent iTerm2 terminal response sequences leaking into REPL input | 批次同步带入 |
| 14 | `2934f30` | fix: 彻底移除 /loop AGENT_TRIGGERS gate | 前期已合并 |
| 19 | `0290fe3` | fix: 关闭 context-collapse 来修复 auto compact 失效 | 批次同步带入 |
| 20 | `ab0bbbc` | fix: 修复内存溢出，compact 时清理持久增长数据结构 | 批次同步带入 |
| 21 | `835dd2d` | fix: 为 sessionStorage Map 添加容量上限 | 批次同步带入 |
| 22 | `b3d28bc` | fix: 为 cacheWarningStateBySource Map 设置上限 | 批次同步带入 |
| 31 | `941bcbd` | fix: third-party API user_id validation error (DeepSeek) | 前期批次 |
| 32 | `9624f88` | fix: 修复第三方 Anthropic base URL 应使用 ExaSearchAdapter | 前期批次 |
| 38 | `e5f31af` | fix: ExecuteExtraTool validateInput 校验 | 前期批次 |
| 40 | `b4e52d0` | fix: 拦截 ExecuteExtraTool 直接调用未搜索的延迟工具 | 前期批次 |
| 43 | `ca29e4e` | fix: 禁用 FORK_SUBAGENT 恢复 Explore 子代理 | 前期批次 |
| 49 | `3ac866b` | fix: 修复缓存命中率警告消息不显示 | 前期批次 |
| 56 | `e784f23` | fix: validate and encode target sessionId in peer messages | Bridge 批次 |
| 58 | `e4403ff` | fix: 移除 RCS 按 machineName 复用 agent 记录 | 已确认无需合并 |
| 63 | `6e1d3d8` | fix: 修复 feature 的使用问题 | CCP 用 if 结构已等效 |
| 64 | `91ee142` | Fix bug OpenAI tooluse, improve error messaging | 前期已存在 |
| 73 | `1f80043` | fix: 子代理 token 消耗显示为 0 | P2 #47 已合并（去重） |
| 86 | `f7f69b7` | fix: 模型别名未解析导致署名显示 haiku | 随 `771e3db` 已覆盖 |
| 88 | `12f5aed` | fix: 恢复消息流中 diff 高亮渲染功能 | CCP 已有 StructuredDiffList |
| 99 | `1b10ea3` | fix: preserve empty reasoning_content for DeepSeek v4 (#399) | 已在 CCP |
| 103 | `3276589` | fix: /dev/tcp /dev/udp 网络伪设备安全检测 | CCP 已有 `05fd5e14` |
| 105 | `b8b48bf` | fix: truncate 函数接收到 undefined/null 时崩溃 | CCP 已有 `d0aa028a` |
| 125 | `13a0bfc` | fix: 修复构建产物 import 失效问题 | 空提交 |
| 138 | `bd6448e` | fix: 修正顺序 | CCP 原本正确 |
| 146 | `01cf45f` | fix: 修复 permission 面板 | 代码已包含 |
| 149 | `a3505ae` | feat: DeepSeek thinking mode support for OpenAI compatibility | 前期批次已带入 |
| 150 | `e86573a` | fix: 修复 -r 模式下键盘输入无响应 | 空提交 |
| 153 | `4e1e681` | fix: 删除 debug 限制 | 代码已包含 |
| 156 | `379e40f` | fix: 回退全屏模式 | 代码已包含 |
| 162 | `354c11f` | fix: improve size calculation for LRU cache and handle nested object | 空提交 |
| 171 | `8645d37` | fix: add Authorization header to peer message requests | e784f23 批次已带入 |
| 175 | `221fb6e` | fix: 修复 @ typeahead 文件搜索无结果的问题 | 空提交 |
| 176 | `a889ed8` | fix: 移除 Settings 中未定义的 Gates 引用 | 空提交 |

### 跳过 commit 列表及原因（93 个）

#### 1. 缺依赖模块 / 云端后台（4 个）

| 上游 Commit | 说明 | 原因 |
|-----------|------|------|
| `52b61c2` | fix: bound agent communication memory growth (#369) | 缺 AgentSummary/summaryContext/summaryPrompt/udsResponseReader |
| `2437040` | feat: 添加云端管理命令 | 缺 CCB 云端后台 API |
| `8fccd32` | fix: 脱敏 probe-subscription-endpoints 日志 | CCB 的 probe 脚本 CCP 未引入 |
| `78d46aa` | fix: 替换 extractMemories 的 require() 为动态 import() | Vite only，CCP 用 Bun.build |

#### 2. CCB 云端 / SaaS 功能（8 个）

| `f8a289b` | OTEL 遥测 | `be97a0b` | AWS Bedrock |
| `31b2fdd` | provider usage 统计 | `96ec96c` | ccb update 命令 |
| `a7e03a5` | interrupt 日志上传 | `9da7345` | Ultraplan Multi-Agent |
| `8137b66` | 初次登录校验 | `eb86e34` | 远程 agent 调度 |

#### 3. Ant 模式 / 穷鬼模式（5 个）

| `e986141` | 穷鬼模式写入 | CCP poor mode 处理不同 |
| `d6bfc34` | ant 模式 | CCP 不开 ant |
| `52a9cc0` | ant 模式 | 同上 |
| `e944633` | getAntModels is not defined | 同上 |
| `4ab4506` | USER_TYPE=ant TUI 无法启动 | 同上 |

#### 4. Skill Learning（CCP 用自己的 Hermes Skill 系统）（3 个）

| `0a9e6c0` | 先关闭 skill learning | CCP 用 Hermes skill 系统 |
| `1a1d570` | 限制 skill-learning 无限增长 | 同上 |
| `1c3b280` | 修复多轮对话缓存失效 skill 提升 | 同上 |

#### 5. Chrome MCP（CCP 已有完整 Chrome MCP 功能）（2 个）

| `d4b30d3` | fix: 修复 chrome 链接版本 | 只改 bun.lock+package.json |
| `e0484e2` | fix: 简化版本 chrome 桥接器 | bun.lock+package.json+setup 脚本 |

#### 6. Node.js 运行时专属（CCP 只跑 Bun）（6 个）

| `7e61e71` | 禁用 UDS_INBOX 修复 nodejs | `c81dac8` | Node UDS socket |
| `4266149` | keep UDS peer failures structured | `a57ca08` | Node es 版本 |
| `ac42ce2` | node loading 按钮计算错误 | `b80483c` | node ws 打包 |

#### 7. Tool Search 2.0 重构（CCP 实测正常，无需重构）（2 个）

| `7be08f5` | Tool Search 基础设施层（4000 行改动） | 无需此重构 |
| `8c157f0` | 统一自建 Tool Search | 依赖 #41，同上 |

#### 8. 纯测试 / CI / 文档 / 类型（14 个）

| `ae7a4e5` | CI 跳过 AutofixProgress 测试 | `ea51474` | 删除 issues 测试 |
| `4a39fd7` | CI test 阶段退出 | `8980013` | issue-template 测试 |
| `80d4e09` | setupAxiosMock 并发丢失 | `547ce9e` | prefetch 测试 |
| `b52c10d` | CI 格式检查 | `6becb8b` | tasks.test.ts 类型错误 |
| `f43350e` | 4 个测试失败修复 | `956e98a` | 重复依赖声明 |
| `1a4e970` | 类型问题(#267) | `8399d9e` | 类型问题 |
| `0b1e678` | mintlify ignore / 侧边栏 | `ff03fe7` | 类型问题 |
| `714ef13` | dev.ts 路径解析 | `2cc626c` | 测试文件 |
| `7935bfb` | debug 启动 | `ac1f029` | external 字面量 |

#### 9. 文件已删除（CCP 无对应代码）（4 个）

| `af0d7dc` | Agents/Teams 纳入 Tool Search | `ad09f38` | 斜杠命令自动补全 |
| `a0dc454` | 服务器双 / 问题 | `be80da4` | 修复缓存 |

#### 10. UX 文案不影响功能（5 个）

| `6ff839d` | 优化压缩错误消息 | `88057b1` | 优化 ModelPicker 副标题 |
| `4d0048a` | 优化权限提示用词 | `8a5ef8c` | 优化用户交互文案 |
| `29a1edb` | 模型选择器 Space to toggle | — | — |

#### 11. 其他跳过原因（14 个）

| 上游 Commit | 说明 | 原因 |
|-----------|------|------|
| `aa06cea` | GLM 署名邮箱 | 不影响功能 |
| `71c89e9` | theme switching | CCP 主题处理不同 |
| `bd6448e` | 修正顺序 | 已存在（CCP 原本正确）→ 已归入 EXISTS |
| `513ccc3` | 修复鉴权 | CCB 私有云后端 |
| `a7d9a22` | 修复 main 文件 | 13199 行 biome 格式化噪音 |
| `919011a` | login 表单 enter 覆盖 | CCB 登录，CCP 无 |
| `3923af4` | login 面板左右切换 | 同上 |
| `4e5a0dd` | 终端高亮 | CCP 无对应 highlight 模块 |
| `d3a607e` | 终端高亮 (dup) | 同上 |
| `17c0669` | 非 UTF-8 文件 round-trip | CCP 删了 encoding.ts |
| `5c499d3` | 脱敏 probe 日志 | CCP 删了 probe 脚本 |
| `8ba51ed` | 条件式 hook Rendered fewer hooks | 16 个冲突；build 模式不触发 |
| `a8ed0cd` | vendor 二进制路径 | CCP 用 --no-splitting |
| `ca1c87f` | usePipeIpc require 崩溃 | CCP 删了 usePipeIpc.ts |
| `562e9da` | Handle undefined command names | useTypeahead.tsx 被重写，冲突太大 |
| `a6bef45` | rg 文件传入 | 加 download-ripgrep 脚本 |
| `6585d0f` | 禁用 COORDINATOR_MODE | **上游关了，CCP 开着！不合！** |
| `91ee142` (dup) | OpenAI tool use | 已存在 |
| `6e598fc` | Merge PR #149 fix/openai-tool-compat | 重复，内容已有 |
| `efaf4af` | Provider Registry/StatusLine/Cache Stats | 3600+ 行新功能 |
| `23bb09d` | model/provider 层改进 | 700 行重构 |
| `d208855` | builtin-tools 增强与测试覆盖 | 1400 行重构 |
| `eec9613` | napi 包测试覆盖 | 非关键 |
| `7e888ce` | 测试 agent 模板 + 文档 | CCP 有独立 README |
| `27a0111` | Bun mock.module 跨文件污染 | 上游测试，CCP 受影响？ |
| `5486d3c` | Bun mock.module 污染修复 | CCB 云端功能测试 |
| `cdd62520` (dup) | 已在批次同步中记录 | — |
| `9afcb39` | bun publish npmrc | CCP 不发布 npm |
| `7d4c427` | highlight.js 静态导入 | CCP 不用 --compile |
| `ecbd5a9` | Bun.hash 不存在 | 本地 Bun 已支持 |
| `9b8503d` | node 环境没有 bun | CCP 只跑 Bun |
| `2545dca` | ccb update bun install | CCP 用 git pull |
| `227083d` | 截图 MIME 硬编码 | CCP 不用 |
| `8fccd32` (dup) | 脱敏日志 | 缺脚本 |

#### 12. Windows 特供（4 个）

| `7a3cc24` | Node.js Windows 环境 | `e38d454` | Windows stdin.ref() 泄漏 |
| `c99021d` | Windows 没有 unzip | `ca086b0` | Windows Computer Use |

#### 13. 延后（1 个）

| 上游 Commit | 说明 | 原因 |
|-----------|------|------|
| `c2ac9a7` | CI workflow + bun.lock + ACP 安全加固（144 file） | 非 ACP 部分已通过 Batch 1a 提取；ACP agent 安全加固待启用 ACP 时再合并 |

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
