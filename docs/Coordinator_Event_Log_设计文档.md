<div align="right">
  <a href="./Coordinator_Event_Log_Design_Doc.md">English</a>
</div>

# Coordinator Event Log — 多 Agent 通信的 Compaction 抗性设计

> CCP v2.6.11 · 2026-06-11 · 完整实现

---

## 一、问题：Compaction 静默蒸发共享上下文

Claude Code 的 Agent Teams（多 worker 编排）有一个结构性缺陷：**每个 worker agent 的对话上下文独立存在，compaction 触发后各自压缩，此前"商量好的共识"随着旧消息被 summary 替换而丢失。**

这不是 Anthropic 的 bug——这是 agent-as-function-call 范式下的必然。当一个 coordinator fork 出 worker、worker 返回结果、coordinator 决策下一步时，所有这些信息都在 LLM 的 token 窗口里。窗口满了 → compaction → 旧消息压缩成摘要 → worker 的中间产物（partial results、理解、错误恢复路径）被丢弃。

CCB 社区 Issue #23620 记录了这个问题：**compaction 后 team context 丢失**。

我们的核心洞察是：**上下文（context）和状态（state）是两种东西，不该放在同一个容器里。** LLM 的 token 窗口是上下文容器，不适合存状态。需要一个独立的状态容器，不受 compaction 影响。

---

## 二、方案：Event Sourcing

走的是事件溯源（Event Sourcing）路线，不是 scratchpad。

### 为什么不是 scratchpad？

之前考虑过让 coordinator 在每次 turn 结束时总结当前状态写入 scratchpad——这是一个"快照"方案。问题：
1. 快照是**事后**的快照。如果 compaction 发生在 coordinator 写完 scratchpad 之前，丢的还是丢了
2. 快照是协调者的**主观摘要**，不是客观事实——coordinator 可能漏掉重要信息
3. 快照不可审计。出问题时你不知道"哪个 worker 什么时候给出了什么结果"

### 事件溯源的优势

事件溯源的核心原则：**不存结果，存发生了什么。**

```
worker_spawned("analyzer") → worker_result("analyzer", {...}) → synthesis(...) → decision("proceed")
```

每一步立即写入事件日志，不等 compaction。Compaction 来的时候，coordinator 从事件日志 fold 出完整的 team 状态。

| 方案 | 写入时机 | Compaction 安全 | 可审计 | 可恢复 |
|------|---------|:---:|:---:|:---:|
| Scratchpad | 事后 | ❌ 可能被抢跑 | ❌ 主观摘要 | ❌ 信息丢失 |
| Event Sourcing | 即时 | ✅ 事件已在外存 | ✅ 完整审计链 | ✅ fold 恢复 |

---

## 三、架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Coordinator Agent                       │
│                                                             │
│  spawn worker ──→ write event ──→ query LLM ──→ ...        │
│       │               │                                     │
│       │               ↓                                     │
│       │      ┌──────────────────┐                           │
│       │      │   EventStore      │   append / read / clear  │
│       │      └────────┬─────────┘                           │
│       │               │                                     │
│       │      ┌────────┴─────────┐                           │
│       │      │  LocalFileEventStore  (.team-events/ JSONL)  │
│       │      │  RemoteEventStore     (HTTP client)          │
│       │      └──────────────────┘                           │
│       │                                                     │
│       ↓                                                     │
│  worker returns ──→ write event ──→ compaction trigger?     │
│                                          │                  │
│                                          ↓                  │
│                                   TeamProjection.fold()     │
│                                   → checkpoint              │
│                                   → clear(before)           │
│                                   → 注入恢复后的 context     │
└─────────────────────────────────────────────────────────────┘
```

### 6 种事件类型

| 事件 | 携带数据 | 触发点 |
|------|---------|--------|
| `session_started` | coordinatorId, sessionId, version | 新 session 开始 |
| `worker_spawned` | workerId, task description | AgentTool fork 触发 |
| `worker_result` | workerId, result summary, exit code | worker 返回 |
| `synthesis` | `<coordinator-synthesis>` XML 内容 | 每个 turn 的 LLM 输出中提取 |
| `decision` | `<decision>` XML 内容 | 同上 |
| `checkpoint` | 完整 TeamProjection state | compaction 完成后写入 |

### Projection（fold-based）

```typescript
const teamState = events.reduce(applyEvent, initialState)
// initialState = { sessionId, workers: {}, decisions: [], checkpointId: null }
```

不是每次从头 fold——checkpoint 就是折叠到某个时间点的快照。恢复时从最近的 checkpoint 快照开始，只需要 fold checkpoint 之后的事件。

### 生命周期

```
session start → write session_started
    ↓
spawn worker_a → write worker_spawned
    ↓
worker_a returns → write worker_result
    ↓
LLM 输出 synthesis + decision → write synthesis, decision
    ↓
... 多轮循环 ...
    ↓
compaction → TeamProjection.fold() → write checkpoint → clear(before checkpoint)
    ↓
session end → clear() 全清
```

---

## 四、实现细节

### 存储：两层可选

| 存储层 | 格式 | 使用场景 |
|--------|------|---------|
| `LocalFileEventStore` | `.team-events/` 目录下 JSONL 文件 | 单机 coordinator |
| `RemoteEventStore` | HTTP client, GET/POST/DELETE `/events` | 跨机 coordinator |

自动切换机制：`eventStoreInstance.ts` 检测 `TEAM_EVENT_SERVER_URL` 环境变量：

```typescript
export const eventStore = TEAM_EVENT_SERVER_URL
  ? new RemoteEventStore(TEAM_EVENT_SERVER_URL)
  : new LocalFileEventStore(teamStoreDir)
```

### HTTP Server（跨机）

```
bun.serve on port 9742:
  GET    /events           → read all events
  POST   /events           → append event
  DELETE /events?before=t  → clear events before timestamp
```

零外部依赖——全部使用 Bun 内置 API（`Bun.serve` + `fetch`）。

### XML Tag 提取

Synthesis 和 Decision 不是靠 LLM 的"自觉"，而是在 system prompt 里注入 XML 标记指令，然后正则提取：

```typescript
const synthesis = extractXmlTag(response, 'coordinator-synthesis')
const decision = extractXmlTag(response, 'decision')
```

如果 LLM 没有输出对应 tag，事件记录为空字符串——不会阻塞流程。

### Compaction 注入点

不是事后注入——修改了 `buildPostCompactMessages` 的签名，让它接收 `teamContext` 参数：

```typescript
// 之前
buildPostCompactMessages(compacted: Message[]): Message[]

// 之后
buildPostCompactMessages(compacted: Message[], teamContext?: TeamState): Message[]
```

compaction 收尾时，从 EventStore project 出 teamContext，渲染为可读的 Markdown，插入到 compressed system prompt 的末尾。

---

## 五、测试策略

| 层级 | 文件 | 覆盖 |
|------|------|------|
| Unit | `teamProjection.test.ts` | fold 逻辑、checkpoint 恢复、XML 渲染 |
| Unit | `remoteEventStore.test.ts` | HTTP 客户端行为 |
| Integration | `coordinator-event-log.test.ts` | 完整 EventStore 生命周期 |
| Smoke | `smoke_event_log.test.ts` | 多 worker 端到端 |
| E2E | `e2e_lifecycle_test.ts` | 跨机：Machine A 写 → Machine B 读 → project → checkpoint → clear → resume |

验证通过的场景：
- 事件写入后立即 project 出正确 team 状态
- checkpoint 后 clear(before) 只保留 checkpoint 之后的事件
- session 结束 clear() 全清
- 跨机 HTTP 读写一致性

---

## 六、为什么不叫"记忆系统"

CCP 自带 Anthropic 的工业级记忆系统（EXTRACT_MEMORIES / autoDream / LODESTONE），那个是针对**跨 session 的个人知识管理**——"这个项目用什么构建工具"、"用户的 API key 放在哪"。

Coordinator Event Log 解决的是完全不同的问题：**同一 session 内多 worker 编排的上下文持久化**——"worker A 刚才返回了什么"、"我们目前是在第几轮 retry"、"coordinator 上一次的决策是什么"。

两者的关系和区别：

| | Memory System | Coordinator Event Log |
|---|---|---|
| 时长 | 跨 session（天/月） | 同一 session（分钟/小时） |
| 内容 | 个人知识 | Worker 状态、决策链 |
| 检索 | LODESTONE relevance scoring | fold projection |
| 生命周期 | 永久保留 | session 结束即清 |
| 写入者 | 后台 agent（autoDream） | coordinator agent（同步写入） |
| 设计模式 | ETL 管道 | Event Sourcing |

共存不冲突。Coordinator Event Log 是内存性工作区，Memory System 是持久知识库。

---

## 七、已知限制与未来方向

| 限制 | 说明 |
|------|------|
| 无并发安全 | 多 coordinator 写同一个 RemoteEventStore 没有锁（设计假设：同一 session 只有一个 coordinator） |
| 无事件压缩 | 大量 worker spawned/results 事件会产生大量 JSONL 行（折中：compaction 后 clear(before) 回收旧事件） |
| 仅 CCP 可读 | 事件格式是 CCP 内部结构，外部 agent（Hermes、Codex）需要适配层 |
| 无事件流 | 不支持 SSE/WebSocket 实时推送到其他 coordinator（当前是 pull 模式） |

### 未来方向

- **事件压缩（snapshot）**：相同类型的事件在 compaction 时自动合并（如 10 个 worker_result → 1 个 snapshot）
- **跨生态 bridge**：A2A 协议的事件适配层，让 Hermes coordinator 消费 CCP 的事件流
- **事件分页**：当单个 session 事件超过 1000 条时，read() 支持 cursor-based 分页
- **写前 A/B 验证**：使用 Claude 模型在写入事件前验证 synthesis/decision 提取的完整性

---

## 八、与 Hermes 的关系

Hermes 的 Kanban 系统（`kanban_db.py`）用 SQLite 做多 worker 状态共享——dispatcher 分配任务、worker 认领、comment 桥接通信。问题：
1. Dispatcher 是哑巴进程，不理解任务语义
2. Worker 之间不能直接通信
3. 没有 compaction 的概念（Hermes 不用 LLM 做 agent loop 的 coordinator）

CCP 的 Coordinator Event Log 补上了"agent coordinator + compaction-resistant state"这块空白。两个系统的交汇点值得一个 Hermes RFC 提案——把 CCP 的 coordinator + event sourcing 思路引入 Hermes 的 Kanban，让 dispatcher 从哑巴进程升级为真正的 agent。

---

## 附：文件清单

```
src/coordinator/
  teamEventStore.ts          EventStore 接口 + LocalFileEventStore
  teamProjection.ts          fold-based projection + XML renderer
  eventStoreInstance.ts      单例 + auto-switch (Local/Remote)
  remoteEventStore.ts        HTTP client
  eventHttpServer.ts         Bun.serve HTTP server (port 9742)
  eventHttpServerEntry.ts    独立启动入口
  coordinatorMode.ts         session start + checkpoint + clear 生命周期
  e2e_lifecycle_test.ts      跨机 E2E
  __tests__/
    teamProjection.test.ts   unit
    remoteEventStore.test.ts unit
    smoke_event_log.test.ts  integration
    coordinator-event-log.test.ts  integration
src/query.ts                 synthesis/decision 提取 + compaction trigger
src/services/compact/compact.ts  buildPostCompactMessages 签名扩展
packages/agent.tool/AgentTool.tsx  spawn event hook
packages/agent.tool/LocalAgentTask.tsx  result event hook
tests/integration/remote-coordinator-event-log.test.ts  跨机集成测试
docs/plans/2026-06-11-coordinator-event-log.md          开发 plan
```

总代码量：~1400 行 TypeScript + ~800 行测试。
