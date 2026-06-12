# 从事件溯源到统一黑板：CCP 多 Agent 通信系统的两次进化

> 2026-06-12 · James Feng · CCP 架构演进实录

---

## 起点：三台机器，三种处境

我们在讨论 CCP 的多 agent 通信架构时，拉进了三个系统做对比。它们落入同一个问题域——"多个 agent 怎么知道彼此在干什么"——但给出的答案完全不同，因为它们的**存储约束**截然不同。

| | Hermes Agent | CCP（Anthropic 原版） | CCP（我们的终态） |
|---|---|---|---|
| 持久化层 | SQLite（操作系统级） | JSONL 文件（现造的） | SQLite（我们加的） |
| 什么东西会摧毁状态 | 没有 | auto-compaction 蒸发 token window | auto-compaction 蒸发 token window |
| 状态在哪 | kv 表（直接读） | 事件日志 → fold 投影（重建） | kv 表（直接读） |
| 事件日志要干嘛 | 不需要 | 生存必须——没有它，compaction 之后 coordinator 什么都记不得 | 审计追查——日常不读，debug 时才翻 |
| 写路径 | `set(key, value)` | `appendFile(JSONL)` | `recordEvent()` — 一次事务写 events + kv |
| fold 在哪 | 没有——last-write-wins 就是 fold | `applyEvent()` switch-case，120 行 | 没有——last-write-wins 就是 fold |
| 加新状态 | 换一个 key 前缀 | 定义新事件类型 → 改 fold | 换一个 key 前缀 |

---

## 第一次进化：Typed Events → Structured Keys（persist 分支）

Anthropic 原版用了 6 种事件类型：

```typescript
WorkerSpawnedEvent    // workerId, directive, agentType
WorkerResultEvent     // workerId, status, summary
CoordinatorSynthesisEvent  // findings, decisions
CoordinatorDecisionEvent   // action, rationale
CoordinatorSessionStartedEvent
CoordinatorCheckpointEvent  // projectedState
```

fold 是一个 120 行的 switch-case，每个 case 知道怎么把特定事件类型折叠到 `TeamState` 里。

**问题是：加一个新事件类型 = 改类型定义 + 改 fold。** 扩展成本随事件类型数量线性增长。

于是我们把所有事件统一为一种格式：

```typescript
type KvEvent = {
  type: 'coordinator.kv'
  key: string      // "worker:3:status", "team:synthesis:findings"
  value: string    // "running", "..."
  writer: string   // "coordinator", "worker-alpha"
}
```

fold 从 120 行 switch-case 变成一行：

```typescript
events.reduce((state, e) => { state[e.key] = e.value; return state; }, {})
```

**加新状态不再需要改任何类型或逻辑——换一个 key 前缀就行。** JSONL 文件格式不变，事件溯源的核心约束（append-only + fold-on-read）不变。这是**给定 JSONL 约束下能做的最好方案**。它在 persist 分支里永久保留，作为 Anthropic 设计路径的终点。

---

## 第二次进化：JSONL → SQLite（main 分支）

但 JSONL 有一个根本问题：**它不是数据库。** 它不会替你处理事务、WAL、崩溃恢复、并发读。每一次 `appendFile` 和 `readFile` 都是你要自己管理的东西。于是我们引入 SQLite。

这不是"存 JSONL 还是存 SQLite"的选择。这是"用一个文件当数据库"和"用一个数据库当文件"的区别。

终态架构：

```
┌──────────────────────────────────────────────┐
│              recordEvent(actor, type, key, value) │
│                                                    │
│  BEGIN TRANSACTION                                 │
│    INSERT INTO events (ts, actor, type, key, value) │
│    UPSERT INTO kv (key, value, version, ...)        │
│  COMMIT                                            │
│                                                    │
│  要么两边都写进去，要么都回滚。                      │
└──────────────────────────────────────────────┘

热路径：coordinator → SELECT * FROM kv WHERE key LIKE 'worker:%'
冷路径：debug 时 → SELECT * FROM events WHERE actor = 'worker:3'
恢复：   corruption → rebuildKvFromEvents()
```

**kv 表是 events 表的物化视图。** 同一笔事务保证它们永远不会分叉。它不是什么"两本账"——是一本账加一个目录。

---

## 三个系统的哲学

**Hermes 是"生来如此"。** 它的 dispatcher 是规则引擎，不是 LLM。规则引擎天然是 poll 模式——`while true { 扫黑板 → 匹配规则 → 执行 }`。SQLite 黑板是唯一的合理选择。它不需要事件溯源，不是因为事件溯源不好，是因为它不需要。

**Anthropic 原版是"被逼如此"。** Claude Code 出生时是单 agent 对话工具。"一个 agent 管多个 agent"是后来塞进去的功能。它把"对话历史"和"团队状态"塞进了同一个 token window。compaction 蒸发这个 window 的时候，团队状态也跟着没了。事件溯源不是设计偏好——是**在没有别的持久化层的前提下，唯一能把状态活着带过 compaction 的方案**。

**我们的终态是"知道了之后，选了更简单的"。** 从 Anthropic 的原版出发，经历过"要不要做个 LLM coordinator""coordinator 是经理还是路由器还是扫地阿姨"的推演，最后回到了 Hermes 最早的结论——**黑板 + 规则引擎**。但比 Hermes 多了一件东西：events 表。因为 CCP 有 Hermes 没有的约束——compaction 会蒸发 coordinator 的上下文——而 events 表的审计追查能力，是专门留给那个"万一 coordinator 做了奇怪决定，你至少知道它看到了什么"的时刻。

---

## 一个没有白费的圈

我们在飞书里画过一张图：

```
CCP coordinator agent（LLM 协调）
    ↓ "借鉴 Hermes blackboard"
SQLite 黑板 + structured keys
    ↓ "coordinator 不用当经理，当路由器"
规则引擎做通信修复
    ↓ "不对，coordinator 只扫地不碰内容"
Janitor 模式
    ↓ "这不是 Hermes 本来就有的吗"
回到原点
```

这不是绕路。这是从没有 SQLite 的约束出发，一步步砍掉不需要的东西，最后独立到达了同一个终点。**Hermes 从第一天就有 SQLite，所以它从起点直接到了终点。我们从没有 SQLite 的地方出发，绕了一圈才到。但绕这一圈，每一步都知道为什么——为什么事件溯源必须存在，为什么 fold 不是多余的，为什么 coordinator 不该是 LLM。**

---

## 当前状态

| 分支 | 内容 | 用途 |
|------|------|------|
| `persist/coordinator-event-sourcing` | JSONL + structured keys | A 社设计路径的存档 |
| `main` | SQLite 黑板（kv + events） | 生产路径 |

persist 分支不会再有改动。它是"给定 JSONL 约束下能做的最好方案"的永久快照。main 分支继续演进。
