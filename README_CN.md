<div align="right">
  <a href="./README.md">English</a>
</div>

# CC Pure — 纯净版 Claude Code

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3986-brightgreen?style=flat-square)]()
[![CodeQL](https://img.shields.io/badge/CodeQL-0%20open%20%C2%B7%2047%20risk%20accepted-yellow?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/tsc-0%20errors-brightgreen?style=flat-square)]()

> Claude Code 的纯净分叉 —— 去遥测、去企业全家桶、保留核心能力。**已抵达 source-map 还原的上限。**
>
> **当前版本（2026-06）：** 人格系统 · Coordinator SQLite 黑板 · 类型完工 · CodeQL 归零

---

## ⚡ 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.11

```bash
curl -fsSL https://bun.sh/install | bash
```

### 安装

```bash
git clone https://github.com/James-FE/CC_Pure.git
cd CC_Pure
bun install
bun run build          # 构建到 dist/（split build, ~586 files）
```

### 配置 API

```bash
# 方式一：环境变量
export ANTHROPIC_BASE_URL="https://your-api/v1"
export ANTHROPIC_API_KEY="sk-xxx"

# 方式二：REPL 内 /login 命令
bun run dev
```

### 配置本地快捷命令

```bash
cat > ~/.local/bin/ccp << 'EOF'
#!/usr/bin/env bash
export PATH="$HOME/.bun/bin:$PATH"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
export NO_PROXY=localhost,127.0.0.1,.local
exec bun /path/to/CC_Pure/dist-nosplit/cli.js "$@"
EOF
chmod +x ~/.local/bin/ccp
```

### 验证

```bash
ccp --version           # 输出: 2.6.11 (Claude Code)
ccp -p "1+1"            # 输出: 2
```

---

## 与上游的关系

CC Pure 基于 CCB v2.6.11 反编译源码，做了以下核心变更：

### 上游同步策略

持续追踪 [Claude Code Best](https://github.com/claude-code-best/claude-code) 上游更新：

| 版本 | 日期 | 合并数 | 说明 |
|------|------|:------:|------|
| soul-distilled | 2026-06-08 | — | **🎭 人格觉醒**：上线模式系统，7 种 AI 人格即时切换 |
| v2.6.11 | 2026-06-06 | 6 commits | **版本同步**：Vite 构建优化 (RSS 966MB→35MB)、ACP subagent 层级透传 |
| type-wrought | 2026-06-08 | — | **🔧 类型系统完工**：Zod v4 + MCP SDK 类型裂缝修复，`tsc` **0 错误** |
| scars-mapped | 2026-06-09 | — | **🛡️ CodeQL 审计完工**：升级 security-and-quality，0 open |

> **累计**：187 候选 commit 审查 → ✅ 59 MERGE / 🟡 34 已有 / ❌ 94 SKIP。详见 [`docs/upstream-sync.md`](docs/upstream-sync.md)

### 移除 / 降级的组件

| 组件 | 状态 | 说明 |
|------|:---:|------|
| Sentry | ❌ 移除 | 数据上报第三方 |
| Pipe IPC / LAN Pipes | ✅ 已恢复 | UDS_INBOX + Coordinator 通信就绪 |
| Coordinator 黑板 | ✅ 已完成 | SQLite 黑板 + 结构化键名 + Janitor，HTTP 跨机 |
| Anthropic 遥测 | ❌ 阻断 | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` |
| Langfuse | 🟡 休眠 | 代码保留，配 key 即激活 |
| GrowthBook | 🟡 本地降级 | 1256 行客户端，自动 fallback |

### 遥测：保留源码，默认关闭，本地接管

Datadog / GrowthBook / BigQuery / 1P Event Logging 源码全保留。`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 阻断所有上报。本地 JSONL sink 写入 `~/.claude/local_analytics.jsonl`：

```bash
python3 scripts/analyze_analytics.py   # 今日报告
tail -f ~/.claude/local_analytics.jsonl # 实时追踪
```

详见 → [Claude Code 的光明和阴影面（遥测系统深度分析）](docs/Claude_Code_的光明和阴影面.md)

### 🤝 通讯系统 — 结构化黑板（blackboard-sourced）

> **与人格系统同级的核心模块。** 多 agent 通信层——比 Anthropic 原版的事件溯源更快、更简单、更不容易出错。
>
> 完整设计文档：[`黑板书通信系统设计文档`](docs/communication-system-design.md) | [演化记录](docs/from-event-sourcing-to-unified-blackboard.md)

基于 SQLite 的**结构化键名黑板**，实现 compaction 抗性多 agent 协调。每次状态变更同时写入审计事件和键值条目，单事务保证一致性——worker 写入，coordinator 读取，janitor 清理。

```
worker 写入 → recordEvent() → [events + kv 在单个 SQLite 事务中]
coordinator 读取 → 按 key 获取最新状态 → janitor 清理过期条目
```

| 组件 | 文件 | 说明 |
|------|------|------|
| BlackboardStore | `src/blackboard/BlackboardStore.ts` | SQLite CRUD：upsert、前缀查询、CAS |
| KvHelpers | `src/blackboard/kvHelpers.ts` | 结构化键构建（`workerKey()`）+ 解析（`parseWorkerKey()`） |
| BlackboardJanitor | `src/blackboard/BlackboardJanitor.ts` | 规则引擎：清理过期键、孤立条目、心跳监控 |
| eventRecorder | `src/blackboard/eventRecorder.ts` | `recordEvent()` — 单事务同时写入 `events` 和 `kv` 两表 |
| RemoteEventStore | `src/coordinator/remoteEventStore.ts` | HTTP 客户端，跨机（Phase 2） |
| HTTP Server | `src/coordinator/eventHttpServer.ts` | Bun.serve:9742，零依赖 |

**键名约定：** `worker:N:status`、`worker:N:result`、`team:sources`、`coordinator:decision`

**已弃用：** `teamEventStore.ts`（JSONL 事件日志）和 `teamProjection.ts`（fold 逻辑）— 保留在 `persist/coordinator-event-sourcing` 分支供参考。

```bash
# 以 coordinator 模式运行（使用黑板）
CLAUDE_CODE_USE_OPENAI=1 bun run dev -- --coordinator
```

→ 设计：[`EN`](docs/Coordinator_Event_Log_Design_Doc.md) · [`中文`](docs/Coordinator_Event_Log_设计文档.md) · [`Plan`](docs/plans/2026-06-11-coordinator-event-log.md)

### 保留的核心能力

| 类别 | Feature | 状态 |
|------|---------|:---:|
| **Agent 协议** | ACP | ✅ |
| **浏览器** | Chrome Use + Computer Use | ✅ |
| **远程控制** | BRIDGE_MODE + SSH_REMOTE | ✅ |
| **自主代理** | PROACTIVE + DAEMON + COORDINATOR_MODE | ✅ |
| **记忆系统** | EXTRACT_MEMORIES + LODESTONE + AWAY_SUMMARY | ✅ |
| **推理增强** | ULTRATHINK + ULTRAPLAN + VERIFICATION_AGENT | ✅ |

### 🎭 人格模式系统（soul-distilled）

`/mode` 在 7 种 AI 人格间即时切换：

| 模式 | 图标 | 说明 | Persona |
|------|:----:|------|:-------:|
| **Claude** | 🎭 | 真品 Claude 人格 — 从泄露 70KB Soul Document 蒸馏 | 2,848 chars |
| Default | ⚡ | 平衡模式，日常开发 | — |
| Gentle | 🌸 | 耐心讲解，适合学习 | 231 chars |
| Dr. Sharp | 🔍 | 严格三步代码审查 | 1,845 chars |
| Workhorse | 🐴 | 自动执行，减少确认 | 203 chars |
| Token Saver | 💰 | 极简回复，省 token | 165 chars |
| Super AI | 🧠 | 深度思考，全面分析 | 266 chars |

```bash
/mode               # 交互式选择器
/mode claude        # Claude 人格
/mode sharp         # 代码审查模式
```

**自定义模式：** `~/.claude/modes/` 下放 YAML → 自动加载。

→ [CCP Claude Persona SWE-bench Lite 评测报告 (v2)](docs/ccp-claude-persona-swebench-report-v2.md) — 跨工具零迁移，90 实例：**+11pp**（68.6% vs 57.5%）

---

## 工程质量

| 指标 | CCB 基线 | CC Pure 当前 | 提升 |
|------|:--------:|:----------:|:----:|
| tsc 错误 | 62 | **0** | 反编译残留全清零 |
| 测试通过 | 3007 | **3986** | +979 |
| 构建 | 不稳定 | **稳定（splitting）** | ✅ |
| 遥测外连 | 有 | **0** | ✅ |
| CodeQL open | 175+ | **0** | 254 fixed · 260 dismissed |
| as any (核心) | 94 | **0** | ✅ |

### 相关文档

- **在线文档（Mintlify）**: [ccb.agent-aura.top](https://ccb.agent-aura.top) — Claude Code 架构详解，文档源码位于 `docs/` 目录

---

## ⚠️ 免责声明

1. **本项目仅供学习研究用途。** Claude Code 所有权利归 [Anthropic](https://www.anthropic.com/)。
2. **非 CCB 官方发布。** CC Pure 是个人维护的纯净分叉。
3. **不提供任何保证。** 使用即表示自行承担风险。
4. **API 合规。** 使用第三方 API 需遵守服务商条款。

---

## 致谢

- [James-FE](https://github.com/James-FE) — 维护者
- [Claude Code Best](https://github.com/claude-code-best/claude-code) — 逆向工程与开源基础
- [Anthropic](https://www.anthropic.com/) — Claude Code 原作者
