# CC_Pure — 纯净版 Claude Code

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![tsc](https://img.shields.io/badge/tsc-0%20errors-brightgreen?style=flat-square)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3068%20pass-brightgreen?style=flat-square)]()
[![Security](https://img.shields.io/badge/CodeQL-187%20open-blue?style=flat-square)]()

> 从 [Claude Code Best (CCB)](https://github.com/claude-code-best/claude-code) 分叉的纯净分支 — 去遥测、去企业全家桶、保留核心能力，可审计、可自建。

---

## 与 CCB 官方项目的关系

CC_Pure 基于 CCB v2.6.6 反编译源码，做了以下核心变更：

### 移除的内容（CCB V6 企业全家桶）

| 移除项 | 原因 |
|--------|------|
| Langfuse 监控 | 企业级 Agent 监控，依赖外部 SaaS |
| Sentry 错误追踪 | 数据上报第三方 |
| Pipe IPC / LAN Pipes | 多机编排，个人使用不需要 |
| UDS_INBOX | 进程间通信管道，构建后 Node.js 环境卡死 |
| GrowthBook 远程配置 | 运行时保留但默认关闭（见下方遥测说明） |
| BigQuery / 1P Event Logging | 运行时保留但默认关闭 |

### 遥测处理策略

**源码保留，运行时默认关闭。** Datadog、Sentry、OpenTelemetry 默认不初始化；GrowthBook / BigQuery / 1P Event Logging 通过 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 环境变量在启动层阻断。strace 实测零外连。

> 保留遥测源码是为了企业级部署需要 — 需要时可以打开，不需要时零开销。

### 保留并验证的核心能力

| Feature | 状态 | 说明 |
|---------|:---:|------|
| BRIDGE_MODE | ✅ | WebSocket 远程控制 |
| DAEMON | ✅ | 守护进程 + 后台 worker |
| ULTRATHINK | ✅ | 扩展深度推理 |
| ACP | ✅ | 外部 Agent 协议（Zed/Cursor 兼容） |
| MONITOR_TOOL | ✅ | 会话监控工具 |
| VOICE_MODE | ✅ | 语音输入 |
| KAIROS | ✅ | 定时任务系统 |
| PROACTIVE | ✅ | 自主代理模式 |
| COORDINATOR_MODE | ✅ | 多 worker 编排 |

### 工程质量

| 指标 | v1.3.0 基线 | CC_Pure 当前 | 提升 |
|------|:----------:|:----------:|:----:|
| tsc 错误 | 62 | **0** | ✅ 全绿 |
| 测试通过 | 3007 | **3068** | +61 |
| 构建 | 不稳定 | **稳定（splitting: true, 562 files）** | ✅ |
| 遥测外连 | 1 次 | **0** | ✅ |

### 安全审计（Phase 0-4）

四阶段安全审计通过 CodeQL（security-extended 套件）完成，核心路径告警全部清零：

| 阶段 | 范围 | 修复要点 |
|:----:|------|----------|
| 0 | 基线建立 | 降级查询套件，过滤反编译噪音 |
| 1 | 隐私泄露 | 凭证脱敏（redact helpers）、RCS 默认绑 127.0.0.1 |
| 2 | 结构对齐 | 删除 `src/tools/`，修复 BashTool / AgentTool 回归 |
| 3 | 漏洞修复 | shell 注入（headersHelper）、URL 解析、HTML 过滤 |
| 4 | 残余告警 | 命令注入（which）、ReDoS（debugFilter）、净化绕过（stripHtml/sedEditParser） |

**CodeQL 基线：** 199 → 187 open（-12），128 fixed（+16）。剩余告警均在 feature-flagged 模块（teleport/bridge/ACP/computer-use），不在本 fork 启用范围内。

详见 [SECURITY.md](SECURITY.md)。

### 上游追踪

CC_Pure 持续跟踪 CCB 上游更新，选择性合入关键补丁（非企业全家桶部分）。详见 [CHANGELOG.md](CHANGELOG.md)。

---

## ⚡ 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.11（目前强制 Bun 运行时）

```bash
curl -fsSL https://bun.sh/install | bash
```

### 安装与运行

```bash
git clone https://github.com/GhostDragon124/CC_Pure.git
cd CC_Pure
bun install
bun run build        # 构建到 dist/
bun dist/cli.js -p "hello"   # 测试
```

### 配置 API

```bash
# 方式一：环境变量
export ANTHROPIC_BASE_URL="https://your-api/v1"
export ANTHROPIC_API_KEY="sk-xxx"

# 方式二：REPL 内 /login 命令
bun run dev
# 然后在 REPL 中输入 /login → 选择 Anthropic Compatible
```

---

## 📖 完整文档

- **[CCB 原版 README](README_CCB.md)** — 上游项目的完整文档（功能特性、调试指南、学习资源）
- **[CCB 在线文档](https://ccb.agent-aura.top/)**
- **[CCB 官方仓库](https://github.com/claude-code-best/claude-code)**

---

## ⚠️ 免责声明

1. **本项目仅供学习研究用途。** Claude Code 的所有权利归 [Anthropic](https://www.anthropic.com/) 所有。
2. **非 CCB 官方发布。** CC_Pure 是个人维护的纯净分叉，未经 CCB 团队审核或认可。
3. **不提供任何保证。** 使用本软件即表示您自行承担风险。作者不对因使用本软件造成的任何损失负责。
4. **API 使用合规。** 使用第三方 API（DeepSeek、OpenRouter 等）需遵守相应服务商的条款。本项目不提供任何 API 密钥。
5. **企业部署警告。** 如需启用遥测模块（GrowthBook / BigQuery / Sentry），请确认您的部署环境符合相关数据隐私法规。

---

## 致谢

- [Claude Code Best](https://github.com/claude-code-best/claude-code) — 逆向工程和开源的基础
- [Anthropic](https://www.anthropic.com/) — Claude Code 原作者
