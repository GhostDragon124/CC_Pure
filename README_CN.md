<div align="right">
  <a href="./README.md">English</a>
</div>

# CC Pure — 纯净版 Claude Code

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3968-brightgreen?style=flat-square)]()
[![CodeQL](https://img.shields.io/badge/CodeQL-0%20open%20%C2%B7%2047%20risk%20accepted-yellow?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/tsc-0%20errors-brightgreen?style=flat-square)]()

> Claude Code 的纯净分叉 —— 去遥测、去企业全家桶、保留核心能力。**已抵达 source-map 还原的上限。**
>
> **当前版本（2026-06）：** 人格系统 + 类型完工 + CodeQL 归零 + Coordinator 事件溯源

---

## ⚡ 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.11

```bash
curl -fsSL https://bun.sh/install | bash
```

### 安装

```bash
git clone https://github.com/GhostDragon124/CC_Pure.git
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
# 创建 ccp 命令
cat > ~/.local/bin/ccp << 'EOF'
#!/usr/bin/env bash
export PATH="$HOME/.bun/bin:$PATH"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
export NO_PROXY=localhost,127.0.0.1,.local
exec bun /path/to/CC_Pure/dist-nosplit/cli.js "$@"
EOF
chmod +x ~/.local/bin/ccp

# 使用
ccp -p "hello world"    # pipe 模式
ccp                     # 交互 REPL
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

持续追踪 [Claude Code Best](https://github.com/claude-code-best/claude-code) 上游更新，按安全优先原则选择性合并：

| 版本 | 日期 | 合并数 | 说明 |
|------|------|:------:|------|
| soul-distilled | 2026-06-08 | — | **🎭 人格觉醒**：上线模式系统，7 种 AI 人格即时切换 |
| v2.6.11 | 2026-06-06 | 6 commits | **版本同步 2.6.5→2.6.11**：Vite 构建优化 (RSS 966MB→35MB)、ACP subagent 层级透传 |
| type-wrought | 2026-06-08 | — | **🔧 类型系统完工**：Zod v4 + MCP SDK 类型裂缝修复，`tsc --noEmit` **0 错误** |
| scars-mapped | 2026-06-09 | — | **🛡️ CodeQL 安全审计完工**：升级 security-and-quality，83→39，0 open |

> **累计**：187 个候选 commit 全量审查 → ✅ 59 MERGE / 🟡 34 已存在 / ❌ 94 SKIP。
> 详见 [`docs/upstream-sync.md`](docs/upstream-sync.md) — 958 行完整合并历史与审查清单。

### 移除 / 降级的组件

| 组件 | 状态 | 说明 |
|------|:---:|------|
| Sentry 错误追踪 | ❌ 移除 | 数据上报第三方 |
| Pipe IPC / LAN Pipes | ✅ 已恢复 | 多机编排，UDS_INBOX + Coordinator 事件溯源完整实现 |
| Coordinator Event Log | ✅ 已完成 | 事件溯源架构：append → projection → checkpoint → clear，HTTP 跨机读写 |
| Anthropic 遥测上报 | ❌ 阻断 | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 启动层拦截 |
| Langfuse 监控 | 🟡 休眠 | 代码保留，配 key 即激活，支持 Docker 自部署 |
| GrowthBook 远程配置 | 🟡 本地降级 | 1256 行完整客户端，远程不可用时自动使用本地静态默认值 |

### 遥测：保留源码，默认关闭，本地接管

源码保留（Datadog / GrowthBook / BigQuery / 1P Event Logging），通过 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 阻断所有上游上报。同时在 `logEvent()` 入口插入了本地 JSONL sink，70+ 事件全量写入 `~/.claude/local_analytics.jsonl`：

```bash
python3 scripts/analyze_analytics.py   # 查看今天的事件报告
tail -f ~/.claude/local_analytics.jsonl # 实时追踪
```

详见 → [Claude Code 的光明和阴影面（遥测系统深度分析）](docs/Claude_Code_的光明和阴影面.md)

### 保留的核心能力

| 类别 | Feature | 状态 | 说明 |
|------|---------|:---:|------|
| **Agent 协议** | ACP | ✅ | 外部 Agent 协议，bridge / permissions / session |
| **浏览器** | Chrome Use + Computer Use | ✅ | 浏览器扩展 + GUI 自动化 |
| **远程控制** | BRIDGE_MODE + SSH_REMOTE | ✅ | React Web UI + WebSocket/SSE + SSH 远程 |
| **自主代理** | PROACTIVE + DAEMON + COORDINATOR_MODE | ✅ | 多 worker 编排 + 事件溯源 |
| **记忆系统** | EXTRACT_MEMORIES + LODESTONE + AWAY_SUMMARY | ✅ | 记忆整理 + 上下文锚点 |
| **推理增强** | ULTRATHINK + ULTRAPLAN + VERIFICATION_AGENT | ✅ | 超深度思考 + 自动验证 |
| **工具系统** | TOKEN_BUDGET + PROMPT_CACHE_BREAK_DETECTION | ✅ | Token 预算管理 |

### 🎭 人格模式系统（soul-distilled）

`/mode` 命令在 7 种 AI 人格间即时切换：

| 模式 | 图标 | 说明 | Persona 长度 |
|------|:----:|------|:----------:|
| **Claude** | 🎭 | 真品 Claude 人格 — 从泄露 70KB Soul Document 蒸馏 | 2,848 chars |
| Default | ⚡ | 平衡模式，日常开发 | — |
| Gentle | 🌸 | 耐心讲解，适合学习 | 231 chars |
| Dr. Sharp | 🔍 | 严格三步代码审查 | 1,845 chars |
| Workhorse | 🐴 | 自动执行，减少确认 | 203 chars |
| Token Saver | 💰 | 极简回复，省 token | 165 chars |
| Super AI | 🧠 | 深度思考，全面分析 | 266 chars |

```bash
/mode               # 交互式选择器
/mode claude        # 直接切换到 Claude 人格
/mode sharp         # 切换到代码审查模式
```

---

## 工程质量

| 指标 | CCB 基线 | CC Pure 当前 | 提升 |
|------|:--------:|:----------:|:----:|
| tsc 错误 | 62 | **0** | 反编译残留+类型裂缝全清零 |
| 测试通过 | 3007 | **3968** | +961 |
| 构建 | 不稳定 | **稳定（splitting: true）** | ✅ |
| 遥测外连 | 有 | **0** | ✅ |
| CodeQL open | 175+ | **0** | 254 fixed · 260 dismissed |
| as any (核心) | 94 | **0** | ✅ |

### 安全审计（Phase 0-6，已完成）

| 阶段 | 范围 | 关键工作 |
|:----:|------|----------|
| 0 | 基线建立 | 降级查询套件，过滤反编译噪音 |
| 1 | 隐私泄露 | 凭证脱敏、RCS 默认绑 127.0.0.1 |
| 2 | 结构对齐 | 删除 `src/tools/` 去重，修复工具回归 |
| 3 | 漏洞修复 | shell 注入、URL 解析、HTML 过滤 |
| 4 | 残余告警 | 命令注入（which）、ReDoS、净化绕过 |
| 5 | security-and-quality | 83→39：44 修/dismiss |
| 6 | 架构债清算 | 47→0：全量风险接受 |

**最终处置**: 254 fixed · 260 dismissed · **0 open**。

### 🧱 反编译的还原上限

在 source-map 重建的范式下，系统性的代码质量改进已触及天花板。后续专注上游更新合并。

---

## Coordinator Event Log（事件溯源架构）

Coordinator 模式具备完整的事件溯源能力，解决多 worker 编排中 **compaction 后 team context 丢失**的问题：

```
coordinator 写事件 → projection (fold) → compaction checkpoint → clear 旧事件
                                                                    ↓
session 结束 → clear() 全清 ← checkpoint 可独立恢复完整 TeamState
```

| 组件 | 文件 | 说明 |
|------|------|------|
| EventStore 接口 | `src/coordinator/teamEventStore.ts` | append / read / clear，6 种事件类型 |
| Projection | `src/coordinator/teamProjection.ts` | fold-based，checkpoint 快照恢复 |
| RemoteEventStore | `src/coordinator/remoteEventStore.ts` | HTTP client（GET/POST/DELETE /events） |
| HTTP Server | `src/coordinator/eventHttpServer.ts` | Bun.serve，端口 9742 |

**跨机部署：**

```bash
# Machine A: 启动事件服务器
TEAM_EVENT_SERVER_PORT=9742 bun run src/coordinator/eventHttpServerEntry.ts

# Machine B: CCP 远程读取 A 的 worker 状态
TEAM_EVENT_SERVER_URL=http://machine-a:9742 bun run dev
```

全部使用 Bun 内置 API，零外部依赖。

---

## ⚠️ 免责声明

1. **本项目仅供学习研究用途。** Claude Code 的所有权利归 [Anthropic](https://www.anthropic.com/) 所有。
2. **非 CCB 官方发布。** CC Pure 是个人维护的纯净分叉，未经 CCB 团队审核或认可。
3. **不提供任何保证。** 使用本软件即表示您自行承担风险。
4. **API 使用合规。** 使用第三方 API 需遵守相应服务商条款。本项目不提供任何 API 密钥。

---

## 致谢

- [GhostDragon124](https://github.com/GhostDragon124) — 本项目的维护者
- [Claude Code Best](https://github.com/claude-code-best/claude-code) — 逆向工程与开源基础
- [Anthropic](https://www.anthropic.com/) — Claude Code 原作者
