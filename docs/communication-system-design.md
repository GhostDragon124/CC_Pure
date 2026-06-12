# CCP 通讯系统：结构化黑板——比原版更好的多 Agent 通信层

> 2026-06-12 · James Feng · CCP 架构模块文档
>
> 深度演化记录见 [`from-event-sourcing-to-unified-blackboard.md`](./from-event-sourcing-to-unified-blackboard.md)

---

## 一句话

CCP 的多 agent 通信系统经历了从"事件溯源"到"结构化黑板"的两次进化，现在的 SQLite 黑板比 Anthropic 原版的 JSONL 事件日志**更快、更简单、更不容易出错**。

---

## 问题：多 Agent 通信到底需要什么

当 coordinator 同时管着 5 个 worker 时，它需要知道三件事：

1. **谁在干活。** worker-3 是 running 还是 done？
2. **产出是什么。** worker-2 的结果在哪？
3. **有没有异常。** worker-5 三分钟前最后一次心跳，现在是不是挂了？

这三个问题的答案，coordinator 必须活着带过 compaction。原文的 token window 会在 compaction 时被清空——如果 coordinator 对 team 的认知全靠上下文记忆，那 compaction 之后它就是个失忆的经理。

---

## Anthropic 原版：事件溯源（给定约束下的最优解）

Anthropic 的方案是 **事件溯源**：coordinator 每做一个决策就写一条事件到 JSONL 文件。compaction 后，从文件里读回所有事件，"折叠"成一个 team 状态快照，重新注入上下文。

```
coordinator 决策 → appendFile(JSONL) → compaction 蒸发上下文
    → 读 JSONL → fold 成 TeamState → 重新注入
```

这个方案在**没有数据库**的前提下无可替代。JSONL 是唯一可用的持久化层，append-only 是最安全的模式，fold 是编译器被迫自己写的垃圾回收。

但它有几个结构性问题：

- **fold 是 120 行的 switch-case，每个事件类型一个分支。** 加一种事件类型 = 改类型定义 + 改 fold。
- **JSONL 不是数据库。** 没有事务、没有崩溃恢复、没有并发控制。`appendFile` 和 `readFile` 之间的竞态全是你自己的责任。
- **fold 要读完整个事件日志。** 1000 条事件 = 读完 1000 行 JSONL = 重建整个状态 = coordinator 等。

这些问题不是设计缺陷——是 JSONL 这个存储介质的硬约束。

---

## 第一次进化：结构化键名（persist 分支）

我们做的第一件事是**把 6 种类型化事件统一成一种**：

```typescript
// 以前：6 种不同类型，fold 要 switch-case 120 行
type WorkerSpawnedEvent = { workerId, directive, agentType }
type WorkerResultEvent = { workerId, status, summary }
// ...

// 现在：一种类型，key 决定语义
type KvEvent = { type: 'coordinator.kv', key: string, value: string, writer: string }
```

fold 从 120 行变成一行：

```typescript
events.reduce((state, e) => { state[e.key] = e.value; return state; }, {})
```

key 的命名约定承担了原本由类型系统承担的工作：`worker:3:status`、`worker:3:result`、`team:sources`。这跟 Hermes 的黑板 key 完全撞车了——两个团队独立到达同一个设计。不同的是，Hermes 从第一天就有 SQLite，它不需要"先把 6 种事件统一成一种"这一步，因为它一开始就没有类型化事件。

persist 分支永久保留了这一步的成果：给定 JSONL 约束下能做的最好方案。

---

## 第二次进化：统一 SQLite 黑板（main 分支）

但 JSONL 的根本问题还在。于是我们引入 SQLite——不是"用 JSONL 还是 SQLite"的选择，是**"用一个文件当数据库"和"用一个数据库当文件"的区别**。

终态架构：

```
┌──────────────────────────────────────────┐
│     recordEvent(actor, type, key, value) │
│                                          │
│  BEGIN TRANSACTION                       │
│    INSERT INTO events (...)               │
│    UPSERT INTO kv (...)                   │
│  COMMIT                                  │
│                                          │
│  要么两边都写进去，要么都回滚。           │
└──────────────────────────────────────────┘

热路径：SELECT * FROM kv WHERE key LIKE 'worker:%'   — coordinator 一秒读完所有 worker 状态
冷路径：SELECT * FROM events WHERE actor = 'worker:3' — debug 时翻审计日志
恢复：  corruption → rebuildKvFromEvents()            — events 是 kv 的 source of truth
```

kv 表是 events 表的物化视图。同一笔事务保证它们不会分叉。coordinator 日常只读 kv——不需要 fold，不需要重建，一行 SELECT。

---

## 和 Hermes 黑板的关系：独立到达的同一个结论

| | Hermes Agent | CCP（我们的终态） |
|---|---|---|
| 黑板载体 | SQLite | SQLite |
| 键名约定 | `worker:3:status` | `worker:3:status` |
| 读写方式 | 直接读 kv | 直接读 kv |
| 审计日志 | 无（last-write-wins 覆盖了历史） | events 表（保留所有历史） |
| coordinator 类型 | 规则引擎（dispatcher） | 规则引擎（janitor） |
| LLM 参与度 | 零 | 零 |

两个系统独立到达了同一个架构。区别只有一个：CCP 多了一张 events 表。不是因为 Hermes "少了什么"，而是因为 CCP 的 coordinator 在 compaction 后会丢上下文——**events 表是专门留给"万一 coordinator 做了奇怪决定，你至少知道它看到了什么"的时刻**。Hermes 的 dispatcher 是纯规则引擎，从头到尾没有"我不知道我为什么做了这个决定"的问题。

---

## 为什么比 Anthropic 原版更好

| | Anthropic 原版 | CCP 黑板 |
|---|---|---|
| 加新状态 | 定义新事件类型 → 改 fold | 换一个 key 前缀 |
| fold 行数 | 120 行 switch-case | 0 行（last-write-wins） |
| 读最新状态 | 读全量 JSONL → fold 重建 | `SELECT ... FROM kv` |
| 事务一致性 | 无 | `BEGIN ... COMMIT` |
| 崩溃恢复 | 自己处理 | WAL 自动处理 |
| 并发写 | 文件锁 | SQLite 写锁 |
| 审计追查 | JSONL 全文扫描 | `SELECT ... FROM events WHERE ...` |
| 扩展成本 | O(事件类型数) | O(1) |

---

## 当前模块总览

| 组件 | 文件 | 职责 |
|------|------|------|
| BlackboardStore | `src/blackboard/BlackboardStore.ts` | SQLite CRUD：upsert、前缀查询、CAS |
| KvHelpers | `src/blackboard/kvHelpers.ts` | 结构化键名构建 + 解析 |
| BlackboardJanitor | `src/blackboard/BlackboardJanitor.ts` | 规则引擎：清理过期键、心跳监控 |
| eventRecorder | `src/blackboard/eventRecorder.ts` | `recordEvent()` 单事务写入 |
| BlackboardSession | `src/blackboard/BlackboardSession.ts` | 每 session 独立 `.db` 文件 |
| BlackboardLifecycle | `src/blackboard/BlackboardLifecycle.ts` | Worker 生命周期钩子 |
| BlackboardTool | `src/tools/BlackboardTool.tsx` | Worker 工具：读/写/心跳 |
| BlackboardCoordinatorTool | `src/tools/BlackboardCoordinatorTool.tsx` | Coordinator 工具：读/扫描/异常检测 |

---

## 相关文档

- **深度演化记录**：[`from-event-sourcing-to-unified-blackboard.md`](./from-event-sourcing-to-unified-blackboard.md) — 三次进化、三个系统的哲学对比
- **Hermes 结构化键名 PR**：[NousResearch/hermes-agent#44891](https://github.com/NousResearch/hermes-agent/pull/44891) — CCP 和 Hermes 独立到达同一个键名约定
- **Coordinator 事件日志设计文档**：[`Coordinator_Event_Log_Design_Doc.md`](../Coordinator_Event_Log_Design_Doc.md)
