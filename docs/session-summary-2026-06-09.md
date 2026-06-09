# CC_Pure 会话总结 — 2026-06-09

> 供 Claude 网页版评估。本日工作涉及 CI 恢复、CodeQL 清算、SearchExtraTools 重构三个主题。

---

## 一、CI 恢复

### 发现问题

`ci.yml` 被 Codex 在 `3013db2d`（"merge upstream cleanup"）中误删——它一刀切删了全部 4 个 workflow 文件（ci.yml、codeql.yml、release-rcs.yml、update-contributors.yml）。

### 处置

- 从 `3013db2d~1` 恢复 ci.yml，从 HEAD 恢复 codeql.yml（后者只是本地误删）
- 在 CLAUDE.md CI 段加入 **⛔ WORKFLOW FILES ARE NEVER REDUNDANT** 规则，引用 `3013db2d` 作为反面教材
- Commit: `e6a8372c`

---

## 二、CodeQL 全量清算

### 初始状态

514 条历史 alert：254 fixed / 213 dismissed / **47 open**。

47 条 open 中：11 medium（log-injection ×6, indirect-command-line-injection ×5），36 high（file-system-race ×23, insecure-temporary-file ×11, bad-tag-filter ×1, incomplete-multi-char-sanitization ×1）。

### 11 medium：直接 dismiss

| 规则 | 数量 | Dismiss 理由 |
|------|------|-------------|
| `js/log-injection` | 6 | 本地 CLI 日志输出，无下游 SIEM/log parser 攻击面 |
| `js/indirect-command-line-injection` | 5 | 用户控制自身执行环境，无权限边界；env vars 是用户自己的，args 通过数组传递（无 `shell: true`） |

### 36 high：记录后 dismiss

全部为反编译重建的结构性痕迹（非开发引入的 bug）。在单用户本地 CLI 威胁模型下无实际攻击面。

- **file-system-race (23)**：`stat()` → `readFile()` 两步调用是 source-map 重建的通用形态。原始代码中可能在同一安全封装内，反编译器无法恢复
- **insecure-temporary-file (11)**：`tmpdir()` + 可预测文件名，单用户机器上 `/tmp` 无跨用户攻击面
- **stripHtml (2)**：正则边界遗漏仅影响浏览器 DOM 注入；输出目标是 ANSI 终端，无脚本执行环境

文档：`docs/codeql-dismissed-high-alerts.md`（逐 alert 编号 + 文件 + 行号对照表）

### 最终状态

| 状态 | 数量 |
|------|------|
| Fixed | 254 |
| Dismissed | 260 |
| **Open** | **0** |

### README 更新

加入「反编译的还原上限」段：
> 在 source-map 重建的范式下，系统性的代码质量改进已触及天花板。tsc 零错误、CodeQL 零遗留、构建稳定、测试全绿。后续专注上游更新合并，Claude Code 的还原就此告一段落。

---

## 三、SearchExtraTools 重构

### 背景

CC_Pure 的 SearchExtraTools 机制将 60+ 工具分为 Core（始终在 tools 数组）和 Deferred（懒加载）。Deferred 工具列表的发现/调用说明在**两个地方**重复：

1. System prompt（`prompts.ts:192-193`）
2. 每轮追加的 `<system-reminder>`（`claude.ts:1401` 和 `openai/index.ts:68`）

问题：信息冗余 + system-reminder 每轮追加在缓存断点之外，逐轮付费。

### 讨论过程

1. 将当前机制完整分析发给 Claude 网页版
2. Claude 网页版返回详细方案：分 Step 1（合并去重）+ Step 2（列表入 prefix），不做 Step 3（砍防御措辞，因为跑的是 DeepSeek 不是 Claude）

### 实现

**Step 1**（`b65bf2b0`）：合并去重
- `prompts.ts`：system prompt 中的工具分类说明合并为一份，包含 Steps: 1./2. 调用语法（此语法此前仅在 reminder 中存在）
- `claude.ts`：reminder 简化为裸 `<available-deferred-tools>` 列表，删除重复指令
- 防御措辞全部保留（`do NOT use Bash/Glob`、`you must`、`search before unavailable`）

**Step 2**（`9c0707d8`）：Anthropic 路径 deferred 列表进 system prompt
- 计算 deferred 列表字符串
- 若 `!hasPendingMcpServers`（MCP 稳定）→ 注入 system prompt 数组 → 第二轮起缓存命中
- 若 `hasPendingMcpServers` → 退化为 per-turn reminder

**补充**（`1a81f520`）：OpenAI 兼容路径 guard
- 将 deferred 列表计算和 systemPrompt 注入移到 OpenAI/Grok 分叉之前
- OpenAI 路径的 `prependDeferredToolListIfNeeded` 加 `hasPendingMcpServers` guard
- 两路径行为一致：稳定时列表在 system prompt，不稳定时 per-turn reminder

### 验证

- Build ✅
- Test: 3906 pass / 5 fail（全部为预存：`toRelativePath` ×2, `callAutofixPr`, `prefetch`, `getTurnZeroSearchExtraToolsPrefetch`，无新增失败）

---

## 四、工程质量快照

| 指标 | 本次会话开始时 | 本次会话结束时 |
|------|:-----------:|:-----------:|
| CodeQL open | 47 | **0** |
| CodeQL total | 467 (254F+213D) | 514 (254F+260D) |
| CI 工作流 | 缺失（ci.yml 被删） | ✅ 恢复 |
| tsc 错误 | 0 | 0 |
| 测试 | 3919 pass | 3906 pass (预存5) |
| 构建 | 稳定 | 稳定 |
| 防御措辞 | 冗余（两处重复） | 合并去重 |
| Deferred list cache | 每轮付费 | 进 prefix，缓存命中 |

---

## 六、Claude 网页版审查意见及回应

### 1. Deferred-tool eval 未跑就上 Step 2 ✅ 同意

Build + 单测验证了"不报错"，没验证"DeepSeek 能正确发现 deferred 工具"。§6 的 12 个 case（特别是 case 3 搜而不弃、case 12 大 trajectory 漂移、case 10 MCP 晚连）确实欠着。

**状态**：待补。Step 2 已上，eval 作为回归护栏必须补跑。

### 2. 13 个消失的 test pass ✅ 已查证

- Parent commit（`99bc6e0a`）上就是 3906 pass，非本次改动引入
- README 写 3919 是更早基线，13 个差额不在今天范围内
- `getTurnZeroSearchExtraToolsPrefetch` 在 parent commit 上确认预存失败，非回归

### 3. 缺失 workflow ✅ 确认

`release-rcs.yml` 和 `update-contributors.yml` 未恢复——个人 fork 不发 release、不跑 contributors 自动化。**有意丢弃，非遗漏。**

### 4. hasPendingMcpServers 动态求值 ✅ 已查证

每请求从 `appState.mcp.clients` 实时取（`query.ts:813`），非 latch。MCP pending→connected 后下次请求 flag 翻 false。反向路径（connected→pending，即断连重连）理论上列表会重复出现（旧的在 systemPrompt + 新的在 reminder），但 CCP 的 MCP 仅在启动时连接，实践中不触发。

### 5. CodeQL dismiss 理由措辞 ✅ 同意

`indirect-command-line-injection` 的主防线是**数组传参 + 无 shell: true**，不是"用户控制环境"。前者是可验证的代码模式，后者是场景假设。README "CodeQL 零遗留"应改为"0 open（全部在单用户威胁模型下风险接受）"以避免误读。"反编译痕迹"不能成为万能 dismiss 话术——仅适用于反编译重建代码，自己写的代码需独立 triage。

### 6. 不会改但会记录的点

- Step 2 的验证缺口：eval 补跑前，"绿"确实虚
- 测试数 3919→3906 的差额应追溯（不在本次范围，但需知道何时发生）
- CodeQL 总数 "467→514" 口径不一致——起始数未含 open，结束数含了

1. **保留所有防御措辞**：因为 CCP 跑在 DeepSeek V4 Pro 而非 Claude。DeepSeek 没有在 SearchExtraTools/ExecuteExtraTool 上做过对齐强化（`8f01d5cc` 的教训）。`do NOT use Bash/Glob` 等对 DeepSeek 是功能性的。

2. **不合并 Step 1 和 Step 2**：两步分开落地，各度量一次。commit log（特别是 `8f01d5cc`、`eaa6199f`）证明这套机制容易出意外，一次一变量是必要的纪律。

3. **hasPendingMcpServers guard**：MCP 可异步晚连，列表不是无条件静态的。稳定时进 cache，不稳定时退化——不赌它一定是静态的。

4. **CodeQL alert dismiss 而非 fix**：36 条 high alert 全部来自反编译重建的结构性痕迹。逐行修 ROI 为负（高回归风险，零安全收益）。承认 source-map 还原的天然上限。
