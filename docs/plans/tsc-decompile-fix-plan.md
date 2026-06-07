# TSC 类型错误修复计划 — 反编译残留（235 个）

> **目标：** 基于 `chore/bridge-green`（1 错误）参考，修复 acp 分支 270 个类型错误中的 235 个反编译残留（排除 35 个社区自写代码 bug）。

**基线：** `chore/bridge-green` commit `27682acf` — 1 error  
**当前：** `acp` — 270 errors（排除社区代码后 235）

---

## 错误分类

### A 类：缺文件 stub（75 errors）

| 缺失模块 | 引用次数 | Bridge-green 状态 |
|---|---|---|
| `src/types/tools.js` | 17 | 文件不存在但无引用（或导出已补齐） |
| `src/types/utils.js` | 15 | 同上 |
| `src/services/contextCollapse/persist.js` | 3 | 同上 |
| `src/services/contextCollapse/operations.js` | 2 | 同上 |
| `src/services/compact/snipProjection.js` | 3 | 同上 |
| `src/types/messageQueueTypes.js` | 3 | 同上 |
| `src/skills/mcpSkills.js` | 2 | 同上 |
| `src/services/skillSearch/signals.js` | 2 | 同上 |
| `src/services/compact/cachedMCConfig.js` | 1 | 同上 |
| `src/utils/toolSearch.js` | 1 | 同上 |
| `src/utils/postCommitAttribution.js` | 1 | 同上 |
| `src/memdir/memoryShapeTelemetry.js` | 2 | 同上 |
| `components/messages/SnipBoundaryMessage.js` | 1 | 同上 |
| `components/messages/UserGitHubWebhookMessage.js` | 1 | 同上 |
| `components/messages/UserForkBoilerplateMessage.js` | 1 | 同上 |
| `components/messages/UserCrossSessionMessage.js` | 1 | 同上 |
| `components/permissions/.../ReviewArtifactPermissionRequest.js` | 1 | 同上 |
| `components/design-system/Byline.js` | 2 | 同上 |
| `components/design-system/Dialog.js` | 2 | 同上 |
| `components/design-system/KeyboardShortcutHint.js` | 2 | 同上 |
| `tools/ToolSearchTool/constants.js` | 2 | 同上 |
| `commands/peers/index.js` | 1 | 同上 |
| `commands/fork/index.js` | 1 | 同上 |
| `environment-runner/main.js` | 1 | 同上 |
| `self-hosted-runner/main.js` | 1 | 同上 |
| 其他零散 | ~5 | 同上 |

**修复策略：** 每个缺失文件创建最小 stub，注释标记为 `// STUB: 待补全`。**每个 stub 必须在 `docs/devlog/02-tsc-stubs.md` 中详细记录**，包含：
- 文件路径
- 被哪些文件引用
- 最小导出内容
- 补全优先级（高/中/低）

### B 类：`unknown` 类型泛滥（78 errors）

| 重灾区文件 | 数量 | 根因 |
|---|---|---|
| `src/utils/task/framework.ts` | 9 | `getState()` 返回 `unknown` |
| `src/utils/teammate.ts` | 8 | 状态对象类型为 `unknown` |
| `src/hooks/useCancelRequest.ts` | 7 | 任务对象类型丢失 |
| `src/commands/context/context-noninteractive.ts` | 8 | `contextCollapse` 方法类型缺失 |
| `src/components/PromptInput/PromptInput.tsx` | 7 | 多处 `unknown` 参数 |
| `src/components/ContextVisualization.tsx` | 7 | 同上 |
| `src/components/TokenWarning.tsx` | 6 | 同上 |
| 其他 | 26 | — |

**修复策略：** 逐文件加类型标注，参考 bridge-green 版本。部分 `unknown` 来自缺失的类型定义文件（与 A 类关联）。

### C 类：缺导出/缺名字（27 errors）

| 根因 | 数量 | 修复 |
|---|---|---|
| `Cannot find name 'feature'` | 2 | 加 import |
| `Cannot find name` — contextCollapse 方法 | ~10 | 补 contextCollapse/index.js 导出 |
| `Cannot find name` — 其他 | ~13 | 逐项补 import 或 stub |
| `no exported member` | 2 | 补导出 |

### D 类：类型不匹配（50+ errors）

| 类别 | 数量 | 修复 |
|---|---|---|
| Property 不存在 | ~40 | 加类型字段或 `as` 断言 |
| 类型转换错误 | 4 | 加 `as unknown as` |
| 重复标识符 | 2 | 删重 |
| 参数类型错误 | ~10 | 收窄类型 |

---

## 执行顺序

### Phase 1：A 类——批量建 stub（预计消 75 错误）
1. 创建 `src/types/tools.js` stub
2. 创建 `src/types/utils.js` stub
3. 创建其他缺失文件的 stub
4. 记录所有 stub 到 `docs/devlog/02-tsc-stubs.md`

### Phase 2：C 类——补导出和名字（预计消 27 错误）
1. 补 `contextCollapse` 导出
2. 补 `feature()` import
3. 补其他缺失的名字

### Phase 3：B + D 类——类型收窄（预计消 130+ 错误）
1. 从 bridge-green 逐文件参考修复
2. 优先高密度文件（task/framework.ts 9 个，teammate.ts 8 个）

---

## 约束

1. **不修社区代码**：ACP、RCS、Bridge、autofix-pr、swarm、ssh 等社区自写功能
2. **每个 stub 必须文档化**：`docs/devlog/02-tsc-stubs.md` 详细记录
3. **构建必须保持通过**：每批修复后 `bun run build`
4. **测试不能回归**：每批修复后 `bun run test`
5. **不引入 `as any`**：用正确类型或 `// @ts-expect-error` 标注
