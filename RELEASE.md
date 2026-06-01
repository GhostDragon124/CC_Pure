# CC_Pure v1.0.0 — 去遥测干净版 Claude Code

> 基于 [CCB (claude-code-best)](https://github.com/GhostDragon124/claude-code-best) v2.1.888 逆向工程版。
> 保留 Claude Code 完整功能 + Bridge 远程控制，剔除所有企业版功能和分析遥测。

## 版本标识

```
Tag:      v1.0.0-pure
Commit:   ed197502
Base:     CCB v2.1.888 (rev 2.1.888)
Commits:  316 total, 30+ CC_Pure 定制
Files:    758 changed, 79,513 insertions
```

## 核心改动

### 🛡️ 遥测清除（4 层纵深防御）

| 层 | 阻断目标 | 方法 |
|---|---------|------|
| Wrapper | OTel / GrowthBook / 1P / Sentry | `~/.local/bin/ccb` 注入 8 个禁用环境变量 |
| init.ts | GrowthBook + 1P Event Logging | 注释初始化调用 + early return |
| sinks.ts | Analytics sink 管道 | 注释 `initializeAnalyticsSink()` |
| main.tsx | Analytics gates 门控 | 注释 `initializeAnalyticsGates()` |

已移除的遥测系统：OpenTelemetry、GrowthBook、1P Event Logging、Sentry、BigQuery Exporter、Datadog RUM。

### 🔧 上游修复合入（15+ commits）

| Commit | 描述 |
|--------|------|
| `1b10ea39` | DeepSeek v4 thinking 空 reasoning_content 修复 |
| `941bcbd2` | 第三方 API user_id 校验修复 |
| `ed619327` | OpenAI token 计数修复 |
| `48a19b8a` | isUsing3PServices 修正 |
| `e7220c53` | promptCache 闭包内存泄漏 |
| `b3d28bcd` | cacheWarning Map 上限 |
| `835dd2d8` | sessionStorage Map 上限 |
| `ab0bbbc4` | compact 清理持久数据结构 |
| `7b52054f` | max/xhigh effort 白名单移除 |
| `b8b48bf7` | truncate 崩溃修复 |
| `ea399f18` `27b665ac` | TypeScript 类型修复 |
| `e33b17bd` | sideQuery 第三方 provider 路由 |

### 🏗️ 构建系统

- **主构建**: `bun run build` (Bun.build, code splitting, 492 files)
- **备选构建**: `bun run build:vite` (Vite 6, 26 chunks, 16.9s)
- TypeScript: 1341 错误 → **0**

### ✅ 保留功能

- Claude Code 完整 CLI 交互
- Bridge / Remote Control 远程访问
- ULTRATHINK 扩展思考
- Daemon 守护进程
- 所有标准工具（Bash, FileEdit, Grep, Agent, MCP 等）
- DeepSeek / OpenAI / Anthropic 多 provider

### ❌ 移除/禁用

- 所有 A 社遥测（OTel, GrowthBook, 1P, Sentry, BigQuery, Datadog）
- 企业版功能（Langfuse, Swarm, Coordinator, Auto Mode, WeChat 等）
- 桌面推广 / 反馈问卷
- 订阅/计费探测

## 安装使用

```bash
git clone https://github.com/GhostDragon124/CC_Pure
cd CC_Pure
bun install
bun run build
ccb          # 通过 ~/.local/bin/ccb wrapper 启动
```

## 上游关系

- **上游**: [GhostDragon124/claude-code-best](https://github.com/GhostDragon124/claude-code-best) (CCB)
- **分叉点**: `562e9daa`
- **上游最新**: v2.6.6 (+419 commits)
- **本版本**: 选择性合入上游修复 + 遥测清除，不含企业功能
