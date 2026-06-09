# CodeQL High-Severity Alerts — Dismissed as Known Debt

> **Date:** 2026-06-09  
> **Total dismissed:** 36 alerts  
> **Decision:** Won't fix — architectural debt inherited from decompiled origin, not exploitable in single-user CLI threat model.

---

## 为什么 dismiss？

这 36 个 high-severity alert 全部来自反编译源码（jarmuine/claude-code → ccb-org/claude-code → CC_Pure 的反编译链）。它们不是开发过程中引入的 bug，而是反编译信息损失的天然痕迹——`stat() → readFile()` 的 TOCTOU 模式、`tmpdir()` 的可预测文件名、正则表达式的边界遗漏。

在这个项目的威胁模型下（单用户本地 CLI 工具，运行在开发者自己的机器上），这些模式**不存在实际的攻击面**：

- **TOCTOU**：`stat` 和 `readFile` 之间文件被篡改需要攻击者已有文件系统写入权限——此时有更简单的攻击路径
- **临时文件**：开发者机器通常单用户，`/tmp` 下没有其他用户的 symlink 攻击面
- **正则边界**：`stripHtml` 的输出渲染到终端（ANSI），不是浏览器 DOM，不存在脚本执行环境

---

## js/file-system-race（23 alerts）

> *"The file may have changed since it was checked."*

**模式**: `stat()` / `existsSync()` 检查文件状态后，再用 `readFile()` / `openSync()` 操作——检查和使用之间存在竞态窗口。

**Dismiss 理由**: 单用户本地进程，无权限边界。反编译重建痕迹，非原始源码意图。修复需要逐行评估并改写为原子操作，高回归风险，零安全收益。

| Alert # | 文件 | 行号 |
|---------|------|------|
| 480 | `src/components/Feedback.tsx` | 161 |
| 369 | `packages/acp-link/src/cert.ts` | 162 |
| 348 | `src/services/localVault/store.ts` | 138 |
| 346 | `src/services/SessionMemory/multiStore.ts` | 234 |
| 335 | `src/cli/bg/tail.ts` | 56 |
| 63 | `src/utils/sessionStorage.ts` | 956 |
| 62 | `src/utils/sessionStorage.ts` | 946 |
| 61 | `src/utils/readFileInRange.ts` | 118 |
| 60 | `src/utils/plugins/validatePlugin.ts` | 873 |
| 59 | `src/utils/plugins/zipCache.ts` | 310 |
| 58 | `src/utils/nativeInstaller/installer.ts` | 170 |
| 57 | `src/utils/json.ts` | 206 |
| 56 | `src/utils/json.ts` | 204 |
| 55 | `src/utils/git.ts` | 698 |
| 54 | `src/utils/git.ts` | 680 |
| 53 | `src/utils/git/gitFilesystem.ts` | 61 |
| 52 | `src/skills/bundled/debug.ts` | 38 |
| 51 | `src/services/teamMemorySync/index.ts` | 593 |
| 50 | `src/services/settingsSync/index.ts` | 406 |
| 49 | `src/services/autoDream/consolidationLock.ts` | 52 |
| 47 | `src/components/FeedbackSurvey/submitTranscriptShare.ts` | 49 |
| 46 | `src/cli/print.ts` | 3054 |
| 45 | `src/bridge/bridgePointer.ts` | 93 |

---

## js/insecure-temporary-file（11 alerts）

> *"Insecure creation of file in the os temp dir."*

**模式**: `join(tmpdir(), ...)` 配合可预测的文件名（`Date.now()`、硬编码前缀）创建临时文件。

**Dismiss 理由**: 单用户开发者机器，`/tmp` 无跨用户攻击面。反编译重建痕迹。测试文件（WorkflowTool.test.ts）仅在 CI 隔离环境运行。

| Alert # | 文件 | 行号 |
|---------|------|------|
| 155 | `src/utils/slowOperations.ts` | 287 |
| 154 | `src/utils/screenshotClipboard.ts` | 26 |
| 153 | `src/utils/plugins/zipCache.ts` | 352 |
| 152 | `src/utils/fsOperations.ts` | 459 |
| 151 | `src/services/settingsSync/index.ts` | 471 |
| 150 | `src/screens/REPL.tsx` | 5139 |
| 148 | `packages/weixin/src/monitor.ts` | 97 |
| 147 | `packages/weixin/src/media.ts` | 159 |
| 146 | `packages/builtin-tools/src/tools/WorkflowTool/__tests__/WorkflowTool.test.ts` | 84 |
| 145 | `packages/builtin-tools/src/tools/WorkflowTool/__tests__/WorkflowTool.test.ts` | 53 |
| 144 | `packages/builtin-tools/src/tools/WorkflowTool/__tests__/WorkflowTool.test.ts` | 28 |

---

## js/bad-tag-filter（1 alert）

> *"This regular expression does not match script end tags like `</script\t\n bar>`."*

| Alert # | 文件 | 行号 |
|---------|------|------|
| 514 | `src/utils/stripHtml.ts` | 13 |

**Dismiss 理由**: `stripHtml` 是终端输出清理函数，输出目标是 ANSI 终端而非浏览器 DOM。正则未覆盖 `<script` 后的 whitespace 变体不会导致脚本执行——终端不执行 JavaScript。

---

## js/incomplete-multi-character-sanitization（1 alert）

> *"This string may still contain `<script`, which may cause an HTML element injection vulnerability."*

| Alert # | 文件 | 行号 |
|---------|------|------|
| 513 | `src/utils/stripHtml.ts` | 20 |

**Dismiss 理由**: 同上——终端输出场景，非浏览器 DOM。多字符替换后的残留 `<script` 无法在终端中触发脚本执行。

---

## 汇总

| 规则 | 数量 | 严重度 | 处置 |
|------|------|--------|------|
| `js/file-system-race` | 23 | high | Dismissed — won't fix |
| `js/insecure-temporary-file` | 11 | high | Dismissed — won't fix |
| `js/bad-tag-filter` | 1 | high | Dismissed — won't fix |
| `js/incomplete-multi-character-sanitization` | 1 | high | Dismissed — won't fix |
| **合计** | **36** | | |

**剩余 open**: 0

---

## 补充说明

1. **来源一致性**: jarmuine/claude-code、ccb-org/claude-code、CC_Pure 共享同一条反编译链。在这些仓库中，相同的文件中存在完全相同的 CodeQL 告警模式。这不是 CC_Pure 独有的质量问题，而是反编译重建的普遍特征。

2. **CodeQL 在反编译项目中的局限**: CodeQL 的安全规则设计给正常开发的代码库——能区分"程序员忘了用原子 API"和"反编译器拆开了原本安全的调用"。在反编译项目中，两种场景的代码形态完全一样，CodeQL 无法区分。

3. **未来评估**: 如果项目从"反编译研究"转向"生产部署"（如作为 MCP server 接受远程请求），部分 TOCTOU 模式需要重新评估。当前阶段以研究和学习为主要目标。
