# CC Pure — 纯净版 Claude Code

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3919-brightgreen?style=flat-square)]()
[![Security](https://img.shields.io/badge/CodeQL-0%20open-brightgreen?style=flat-square)]()

> Claude Code 的纯净分叉 —— 去遥测、去企业全家桶、保留核心能力。可审计、可自建、数据主权归你。

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
# 创建 ccp 命令（一行搞定）
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
| soul-distilled | 2026-06-08 | — | **🎭 人格觉醒**：上线模式系统，7 种 AI 人格即时切换。70KB 泄露 Soul Document 蒸馏为 Claude 专属 persona，模式 systemPrompt 注入系统提示链路打通 |
| v2.6.11 | 2026-06-06 | 6 commits | **版本同步 2.6.5→2.6.11**：Vite 构建优化 (RSS 966MB→35MB)、ACP subagent 层级透传、cacheWarningEnabled 配置、ACP loadSession/sessionId 对齐。合 6 个功能 commit，跳 1 个（edit tool 旧逻辑删除 — CCP fork 点） |
| v2.6.11-ccp | 2026-06-08 | — | **🎉 正式版**：Anthropic-core as any 94→1、反编译残留全量清零 (tsc 270→20)、CodeQL 安全审计完成 (175→0)、上游 commit 逐条审查 187→59 MERGE、完整类型安全文档体系 |
| v2.6.5 | 2026-06-05 | 8 commits | **类型修复**：反编译残留全量清零（270→22，248 个修复。剩余 22 为社区代码） + 上游安全 cherry-pick x8 |
| v2.3.0 | 2026-06-04 | 7 commits | **RCS/Web 全量迁移 + SSH Remote**：vanilla JS → React（29 组件 + shadcn/ui），SSH stub 替换为 2029 行完整实现 |
| v2.2.2 | 2026-06-04 | 16 文件 | **Autonomy 全量合并**：f2e9af49 PR #386 源码 + 11 测试文件，3699 pass |
| v2.2.1 | 2026-06-04 | 2 | OpenAI fixes backfill：c82f5994 (stop_reason/usage/max_tokens) + 901628b4 (MCP 工具可见性) |
| v2.2.0 | 2026-06-04 | 2 | Batch 1a 安全加固 + ad09f38f 斜杠补全 |
| v2.1.0 | 2026-06-04 | 2 | REVIEW 24 执行完毕 |
| v2.0.0 | 2026-06-04 | 12 | P3 A 完成 |
| v1.8.0 | 2026-06-04 | 23 | P2 完成 |
| ... | 2026-06 | 10 | P0/P1 + 基础设施同步 |

> **累计**：187 个候选 commit 全量审查 → ✅ 59 MERGE / 🟡 34 已存在 / ❌ 94 SKIP。
> 详见 [`docs/upstream-sync.md`](docs/upstream-sync.md) — 958 行完整合并历史与审查清单。

### 移除 / 降级的组件

| 组件 | 状态 | 说明 |
|------|:---:|------|
| Sentry 错误追踪 | ❌ 移除 | 数据上报第三方，CCP 无此集成 |
| Pipe IPC / LAN Pipes | ❌ 禁用 | 多机编排，个人使用不需要 |
| UDS_INBOX | ❌ 禁用 | 进程间通信管道，Node.js 环境卡死 |
| Anthropic 遥测上报 | ❌ 阻断 | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 启动层拦截 |
| Langfuse 监控 | 🟡 休眠 | 代码保留（`src/services/langfuse/`），配 key 即激活，支持 Docker 自部署 |
| GrowthBook 远程配置 | 🟡 本地降级 | 1256 行完整客户端，远程不可用时自动使用本地静态默认值 |

### 遥测：保留源码，默认关闭，本地接管

**源码保留**（Datadog / GrowthBook / BigQuery / 1P Event Logging 全部在代码里），但通过 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 在启动层阻断所有上游上报。

同时我们在 `logEvent()` 入口插入了**本地 JSONL sink**，所有 70+ 事件全量写入 `~/.claude/local_analytics.jsonl`。数据主权归你——你可以用自己的分析脚本查看使用统计。

```bash
# 查看今天的事件报告
python3 scripts/analyze_analytics.py

# 实时追踪
tail -f ~/.claude/local_analytics.jsonl
```

详见 → [Claude Code 的光明和阴影面（遥测系统深度分析）](docs/Claude_Code_的光明和阴影面.md)

### 保留的核心能力

| 类别 | Feature | 状态 | 说明 |
|------|---------|:---:|------|
| **Agent 协议** | ACP | ✅ | 外部 Agent 协议，含 bridge / permissions / session / acp-link manager |
| **浏览器** | Chrome Use | ✅ | Claude in Chrome 集成，通过浏览器扩展执行操作 |
| | Computer Use | ✅ | GUI 自动化（截图/点击/输入），`packages/@ant/computer-use-mcp/` |
| **远程控制** | BRIDGE_MODE | ✅ | Remote Control 私有部署（React Web UI + shadcn/ui 组件库），WebSocket + SSE 实时推送 |
| | SSH_REMOTE | ✅ | SSH 远程连接（2029行完整实现），本地 REPL + 远端工具执行，SSHSessionManager + SSHProbe + SSHDeploy |
| **自主代理** | PROACTIVE | ✅ | 主动自主代理模式，SleepTool 控制 tick 节奏 |
| | DAEMON | ✅ | 守护进程 + 后台 worker |
| | COORDINATOR_MODE | ✅ | 多 worker 编排 |
| | BG_SESSIONS | ✅ | 后台会话管理（ps/logs/attach/kill） |
| **记忆系统** | EXTRACT_MEMORIES | ✅ | /dream 记忆整理 + autoDream 自动蒸馏 |
| | AWAY_SUMMARY | ✅ | 离线摘要（用户离开后生成总结） |
| | LODESTONE | ✅ | 上下文锚点，优化长对话的相关性检索 |
| **推理增强** | ULTRATHINK | ✅ | 超深度思考模式 |
| | ULTRAPLAN | ✅ | 超级规划模式，深度分析后生成实施计划 |
| | VERIFICATION_AGENT | ✅ | 任务完成后自动验证 |
| **工具系统** | TOKEN_BUDGET | ✅ | Token 预算管理与控制 |
| | PROMPT_CACHE_BREAK_DETECTION | ✅ | Prompt cache 破裂检测 |
| **输入/摘要** | VOICE_MODE | 🟡 | 代码完整（`src/voice/` + `voiceStreamSTT.ts`），需 Anthropic OAuth 凭证 + GrowthBook kill-switch 放行，CCP 暂无可用方式登录 |
| | KAIROS_BRIEF | 🟡 | 代码完整，依赖 KAIROS（`isBriefEntitled = feature('KAIROS') || feature('KAIROS_BRIEF')`），KAIROS 本身不可用故绑定休眠 |
| **定时任务** | KAIROS | 🟡 | 代码完整，运行时需 GrowthBook + OAuth 后端（CCP 暂无） |
| **可观测性** | Langfuse | 🟡 | 自托管 LLM 追踪（`src/services/langfuse/`），设 `LANGFUSE_PUBLIC_KEY` + `SECRET_KEY` 即激活，支持 Docker 自部署 |
| **远程配置** | GrowthBook | 🟡 | 1256 行完整客户端，远程不可用时自动降级到本地静态默认值 |

### 🎭 人格模式系统（soul-distilled）

`/mode` 命令在 7 种 AI 人格间即时切换，每种模式自带专属 systemPrompt、UI 主题色、权限策略和响应风格：

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

**自定义模式**：在 `~/.claude/modes/` 下放 YAML 文件即可扩展，自动加载并与内置模式合并。详见 `~/.claude/modes/claude.yaml` 示例。

> Claude 人格提炼自 Anthropic 内部 Claude 4.5 Opus Soul Document（泄露于 2026 年 5 月）。
> 包含核心人格特质、诚实原则（7 条）、帮助性与谨慎的平衡、协作立场、身份稳定性。
> 完整蒸馏版 → `src/modes/personas/claude.ts`，一键安装版 → `~/.claude/modes/claude.yaml`。

---

## 工程质量

| 指标 | CCB 基线 | CC Pure 当前 | 提升 |
|------|:--------:|:----------:|:----:|
| tsc 错误 | 62 | **20** (全部社区代码) | 反编译残留清零 |
| 测试通过 | 3007 | **3919** | +912 |
| 构建 | 不稳定 | **稳定（splitting: true）** | ✅ |
| 遥测外连 | 有 | **0** | ✅ |
| CodeQL open | 175+ | **0** | ✅ |
| as any (核心) | 94 | **1** (社区代码) | ✅ |

### 安全审计（Phase 0-4，已完成）

四阶段安全审计，175 个 CodeQL 告警全量审查并关闭：

| 阶段 | 范围 | 关键修复 |
|:----:|------|----------|
| 0 | 基线建立 | 降级查询套件，过滤反编译噪音 |
| 1 | 隐私泄露 | 凭证脱敏、RCS 默认绑 127.0.0.1 |
| 2 | 结构对齐 | 删除 `src/tools/` 去重，修复 BashTool/AgentTool 回归 |
| 3 | 漏洞修复 | shell 注入、URL 解析、HTML 过滤 |
| 4 | 残余告警 | 命令注入（which）、ReDoS、净化绕过 |

**全部 175 个告警经人工审查后关闭**：误报（PKCE SHA-256、execa 数组 args）、feature-gated 代码、或预期行为。详见 [SECURITY.md](SECURITY.md)。

---

## 本地开发

```bash
bun install
bun run dev           # 开发模式（默认全 feature 开启）
bun run build         # 生产构建
bun test              # 3919 tests
```

---

## ⚠️ 免责声明

1. **本项目仅供学习研究用途。** Claude Code 的所有权利归 [Anthropic](https://www.anthropic.com/) 所有。
2. **非 CCB 官方发布。** CC Pure 是个人维护的纯净分叉，未经 CCB 团队审核或认可。
3. **不提供任何保证。** 使用本软件即表示您自行承担风险。
4. **API 使用合规。** 使用第三方 API 需遵守相应服务商条款。本项目不提供任何 API 密钥。

---

## 致谢

- [Claude Code Best](https://github.com/claude-code-best/claude-code) — 逆向工程和开源的基础
- [Anthropic](https://www.anthropic.com/) — Claude Code 原作者
