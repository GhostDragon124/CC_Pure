# 分支：persist/coordinator-event-sourcing

## 存了什么

这是 CCP 采用 **Anthropic 原版事件溯源方案** 的快照——纯 JSONL 事件日志 + fold 投影，没有任何 SQLite 黑板代码。

## 核心文件

| 文件 | 作用 |
|------|------|
| `src/coordinator/teamEventStore.ts` | Event 类型定义 + EventStore 接口 + LocalFileEventStore（JSONL） |
| `src/coordinator/teamProjection.ts` | `applyEvent()` + `projectTeamState()` + `renderTeamContext()` |
| `src/coordinator/eventStoreInstance.ts` | 单例 + auto-switching（本地 JSONL / 远程 HTTP） |
| `src/coordinator/remoteEventStore.ts` | HTTP 客户端 EventStore（Phase 2 跨机器） |
| `src/coordinator/eventHttpServer.ts` | Bun.serve 事件服务器 |
| `src/coordinator/coordinatorMode.ts` | Coordinator mode 启动 + compaction hook（**不含黑板代码**） |
| `docs/Coordinator_Event_Log_设计文档.md` | 中文设计文档 |
| `docs/Coordinator_Event_Log_Design_Doc.md` | 英文设计文档 |
| `docs/plans/2026-06-11-coordinator-event-log.md` | 实施计划 |

## 为什么不继续用

讨论结论（2026-06-12）：
- 事件溯源在 CCP 的约束下是正确的——因为没有 SQLite
- 但它有维护成本：新事件类型需要改 fold、checkpoint 逻辑、1400 行代码
- Hermes 的黑板（SQLite + structured keys）证明了更简单的方案可行
- 最终决定：事件日志 + fold → SQLite 黑板（kv 表 + events 表同一事务）

## 为什么保留

- 这是 Anthropic/CCB 的原生设计思路，有参考价值
- 事件溯源的语义（有类型的事件、结构化聚合）比 pure last-write-wins 更丰富
- 未来如果需要在 CCP 中做完整审计链路，事件表的 schema 可以从这里借鉴
- 符合 CCP "保留上游设计痕迹" 的理念
