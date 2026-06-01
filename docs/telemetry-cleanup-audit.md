# CC_Pure 遥测清理审计报告

> 审计日期：2026-06-01
> 审计范围：`claude-code-best` (ccb) v2.1.888 全量源码
> 审计方法：源码静态分析 + strace 网络抓包实测

---

## 一、审计结论

| 项目 | 状态 |
|------|------|
| **Datadog 日志上报** | ✅ 已默认禁用 |
| **Sentry 错误上报** | ✅ 已默认禁用 |
| **OpenTelemetry 三方遥测** | ✅ 已默认禁用 |
| **1P Event Logging (BigQuery)** | 🔴 源码仍在，需清理 |
| **GrowthBook 远程配置/Feature Flags** | 🔴 源码仍在，需清理 |
| **BigQuery Metrics Exporter** | 🔴 源码仍在，需清理 |
| **1P API 调用 (api.anthropic.com)** | 🔴 默认仍会发起 |

**实测数据**（strace 网络抓包）：

| 环境变量 | api.anthropic.com 连接 |
|----------|----------------------|
| 无防护 | 1 次 |
| `DISABLE_TELEMETRY=1` | **1 次**（未完全阻断！） |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` | 0 次 ✅ |

---

## 二、遥测系统详情

### 1. Datadog 日志上报 — ✅ 已清除

**文件**：`src/services/analytics/datadog.ts`

ccb 已将硬编码的 Anthropic 内部 Datadog 端点改为环境变量驱动：
```typescript
const DATADOG_LOGS_ENDPOINT = process.env.DATADOG_LOGS_ENDPOINT ?? ''  // 默认空
const DATADOG_CLIENT_TOKEN = process.env.DATADOG_API_KEY ?? ''          // 默认空
```
`initializeDatadog()` 在端点或 Token 为空时直接返回 `false`，不启动任何上报。

**修改记录**：DEV-LOG 2026-04-03「Datadog 日志端点可配置化」

---

### 2. Sentry 错误上报 — ✅ 已默认禁用

**文件**：`src/utils/sentry.ts`

`initSentry()` 在 `SENTRY_DSN` 未设置时为纯 no-op。ccb 未配置 DSN。

---

### 3. OpenTelemetry 三方遥测 — ✅ 已默认禁用

**文件**：`src/utils/telemetry/instrumentation.ts`

需要 `CLAUDE_CODE_ENABLE_TELEMETRY=1` 才初始化 OTEL SDK。默认不启用。

---

### 4. 1P Event Logging (BigQuery) — 🔴 需清理

**文件**：
- `src/services/analytics/firstPartyEventLogger.ts` (449行)
- `src/services/analytics/firstPartyEventLoggingExporter.ts`
- `src/services/analytics/metadata.ts`
- `src/services/analytics/config.ts`

**行为**：将事件通过 OpenTelemetry SDK 批量导出到 `https://api.anthropic.com/api/event_logging/batch`

**初始化路径**：
```
src/entrypoints/init.ts:95-106
  → import firstPartyEventLogger + growthbook
  → initialize1PEventLogging()
  → is1PEventLoggingEnabled() → !isAnalyticsDisabled()
  → isAnalyticsDisabled() 检查 NODE_ENV / Bedrock / Vertex / Foundry / isTelemetryDisabled()
```

**问题**：`isAnalyticsDisabled()` 在默认配置下返回 `false`，导致 1P 日志正常启动。
`DISABLE_TELEMETRY=1` 应该能阻断此路径，但实测发现仍有连接（可能是 GrowthBook 初始化时绕过）。

**建议清理方案**（见第四节）

---

### 5. GrowthBook 远程配置 — 🔴 需清理

**文件**：`src/services/analytics/growthbook.ts` (1256行)

**行为**：
- 启动时连接 `https://api.anthropic.com/` 拉取 feature flags
- 每 6 小时定时刷新
- 发送用户属性：deviceId, sessionId, organizationUUID, accountUUID, email, subscriptionType 等

**用途**：控制 Datadog 开关、事件采样率、sink killswitch、自动更新等

**初始化**：`src/entrypoints/init.ts:95-106` 与 1P Event Logging 同步加载

---

### 6. BigQuery Metrics Exporter — 🔴 需清理

**文件**：`src/utils/telemetry/bigqueryExporter.ts`

**行为**：每 5 分钟导出 OTel metrics 到 `https://api.anthropic.com/api/claude_code/metrics`

---

### 7. 其他潜在遥测点

| 文件 | 描述 | 风险 |
|------|------|------|
| `src/utils/startupProfiler.ts` | 采样启动性能数据上报 | 低（ant 100% / 外部 0.5%） |
| `src/utils/telemetry/betaSessionTracing.ts` | 调试 trace | 低（需显式启用） |
| `src/utils/plugins/fetchTelemetry.ts` | Plugin/MCP 下载遥测 | 低 |
| `src/services/settingsSync/` | 设置同步到远程 | 中（Feature gate 控制） |
| `src/services/remoteManagedSettings/` | 企业远程配置 | 低（仅企业用户） |

---

## 三、`DISABLE_TELEMETRY=1` 为何不够？

`src/utils/privacyLevel.ts` 定义了三级隐私：

```
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC → essential-traffic（最严格）
DISABLE_TELEMETRY                        → no-telemetry（中等）
（无设置）                                → default（全开）
```

`DISABLE_TELEMETRY=1` 触发 `no-telemetry` 级别，理论上应禁用 Datadog + 1P Events + 反馈问卷。

但 **实测发现**：在此构建版本中，`DISABLE_TELEMETRY=1` 仍产生了 1 次 `api.anthropic.com:443` CONNECT 连接。

**可能的绕过路径**：
1. GrowthBook 在 `isGrowthBookEnabled()` 检查之前就开始初始化
2. Settings Sync 或 Remote Managed Settings 不经过 `isAnalyticsDisabled()` 检查
3. 某个初始化路径使用了缓存的旧配置

`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 触发 `essential-traffic` 级别——**最严格**，实测 **零** `api.anthropic.com` 连接。

---

## 四、建议清理方案

### 方案 A：纯配置（推荐，不修改源码）

修改 ccb wrapper (`~/.local/bin/ccb`)：
```bash
#!/bin/bash
export PATH="$HOME/.bun/bin:$PATH"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
exec bun /home/spark/workspace/claude-code-best/dist/cli.js "$@"
```

**优点**：零代码改动，配置即生效
**缺点**：依赖环境变量，如被清除则遥测恢复

### 方案 B：源码级清理（更彻底）

在以下位置插入硬编码防护：

1. **`src/services/analytics/config.ts`** — 在 `isAnalyticsDisabled()` 开头加 `return true`
2. **`src/entrypoints/init.ts`** — 注释 L95-106 的 1P Event Logging + GrowthBook 初始化
3. **`src/utils/telemetry/bigqueryExporter.ts`** — 加 hard return

### 方案 C：混合方案（推荐）

- 配置层：ccb wrapper 加 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`（防御层）
- 源码层：在关键初始化路径加不可绕过的守卫（确保层）

---

## 五、已验证的安全特性

以下 ccb 已有的安全修改值得肯定：

| 修改 | 日期 | 效果 |
|------|------|------|
| Datadog 端点可配置化 | 2026-04-03 | 默认不向 Datadog 发数据 |
| 移除反蒸馏机制 | 2026-04-02 | 删除 fake_tools、anti_distillation |
| 默认关闭自动更新 | 2026-04-03 | 防止覆盖本地修改 |

---

## 六、附录：审计工具链

```bash
# 源码静态审计
grep -rn "telemetry\|analytics\|api.anthropic.com\|datadog\|growthbook\|sentry" src/ | grep -v node_modules

# 网络抓包实测
strace -f -e trace=network -o /tmp/ccb_net.log \
  env CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 ccb --print -p "test" 2>&1
grep "api.anthropic" /tmp/ccb_net.log
```

---

*本报告基于 ccb v2.1.888，源码路径 `~/workspace/claude-code-best/`*
