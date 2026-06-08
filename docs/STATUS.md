# CC Pure — 项目状态

> 最后更新：2026-06-09  
> Tag: `scars-mapped`

## 核心指标

| 维度 | 数值 | 说明 |
|:---|:---:|:---|
| **tsc --noEmit** | 🟢 0 | 史上首次清零（反编译残留 + Zod v4 类型裂缝全修复） |
| **as any（Anthropic 核心）** | 🟢 0 | 94→0，Zod v7 用 `zodMCPCompat` shim，其余 43 处全在生成代码/社区适配器 |
| **测试** | 🟢 3915 pass / 5 fail | 5 fail 为预先存在的 flaky tests（toRelativePath, callAutofixPr, prefetch, queryModelOpenAI） |
| **构建（split）** | 🟢 稳定 | `dist/` 586 chunks，RSS 35MB（vs 单文件 966MB） |
| **构建（nosplit）** | 🟢 可用 | `dist-nosplit/cli.js` 29MB，bun/node 兼容 |
| **CodeQL** | 🟡 39（已知架构债） | 175→83→39，Phase 0-5 全量审查 |
| **遥测外连** | 🟢 0 | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 启动层阻断 |
| **上游同步** | 🟢 187→59 MERGE | 全量 commit 审查完成 |

## 代码规模

| 指标 | 数值 |
|:---|---:|
| 文件数 | 3,224 |
| src/ 代码行数 | ~499K |
| workspace packages | 17 |
| 测试文件 | 251 |
| 总 commits | 614 |

## 里程碑

| Tag | 日期 | 说明 |
|:---|:---|:---|
| `scars-mapped` | 2026-06-09 | 🛡️ CodeQL 安全审计完工 — 83→39，44 条修/dismiss，3 处回归 revert |
| `type-wrought` | 2026-06-08 | 🔧 类型系统完工 — Zod v4 shim，tsc=0，as any 94→0 |
| `codeql-tamed` | 2026-06-08 | 📋 CodeQL Phase 1-4 — 175→0 初版 |
| `soul-distilled` | 2026-06-08 | 🎭 人格系统上线 — 7 种模式 |
| `v2.6.11-ccp` | 2026-06-08 | 🎉 正式版基线 — 反编译残留清零，上游合并完成 |

## 已知问题

### 架构债（不修）

| 规则 | 数量 | 原因 |
|:---|---:|:---|
| `js/file-system-race` | 23 | TOCTOU，需原子化 API 改造 |
| `js/insecure-temporary-file` | 11 | 临时文件路径可预测，需 mkstemp |
| `js/indirect-command-line-injection` | 5 | 环境变量→命令拼接，需输入净化 |
| **合计** | **39** | 详见 `docs/CodeQL_KNOWN_DEBT.md` |

### Flaky Tests（5 条）

| 测试 | 现象 |
|:---|:---|
| `toRelativePath` ×2 | 全量跑偶发 fail，隔离跑全过（test pollution） |
| `callAutofixPr` | PR teleports args 断言偶发不匹配 |
| `prefetch` | 子进程隔离 runner 偶发超时 |
| `queryModelOpenAI` | mock 泄漏 flake |

## 功能状态

| Feature | 状态 | 说明 |
|:---|---:|:---|
| ACP | ✅ | 外部 Agent 协议，bridge/permissions/session/link manager |
| Chrome Use | ✅ | 浏览器集成 |
| Computer Use | ✅ | GUI 自动化 |
| Remote Control (BRIDGE_MODE) | ✅ | React Web UI + WebSocket/SSE |
| SSH Remote | ✅ | 2029 行完整实现 |
| PROACTIVE（自主代理） | ✅ | SleepTool 控制 tick |
| DAEMON | ✅ | 守护进程 + worker |
| BG_SESSIONS | ✅ | 后台会话 |
| EXTRACT_MEMORIES | ✅ | /dream 记忆整理 |
| ULTRATHINK/ULTRAPLAN | ✅ | 深度推理模式 |
| VERIFICATION_AGENT | ✅ | 任务自动验证 |
| TOKEN_BUDGET | ✅ | Token 预算管理 |
| VOICE_MODE | 🟡 | 代码完整，需 Anthropic OAuth |
| KAIROS/KAIROS_BRIEF | 🟡 | 代码完整，需 GrowthBook + OAuth 后端 |
| Langfuse | 🟡 | 自托管追踪，配 key 即激活 |
| GrowthBook | 🟡 | 1256 行客户端，远程不可用时本地降级 |

## 被移除/降级

| 组件 | 状态 |
|:---|---:|
| Sentry | ❌ 移除 |
| Pipe IPC / LAN Pipes | ❌ 禁用 |
| UDS_INBOX | ❌ 禁用 |
| Anthropic 遥测 | ❌ 阻断（本地 JSONL sink 接管） |
| 社区 Gemini 实现 | ❌ 删除（保留 @ant 原版） |

## 文档索引

| 文档 | 路径 |
|:---|:---|
| 安全审计 | `README.md` § 安全审计 |
| 架构债 | `docs/CodeQL_KNOWN_DEBT.md` |
| 上游同步 | `docs/upstream-sync.md` |
| 测试规范 | `docs/testing-spec.md` |
| 遥测分析 | `docs/Claude_Code_的光明和阴影面.md` |
| Zod 类型修复 | `README.md` § Zod v4 类型裂缝修复 |
