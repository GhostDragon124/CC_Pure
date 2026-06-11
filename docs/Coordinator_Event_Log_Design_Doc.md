<div align="right">
  <a href="./Coordinator_Event_Log_设计文档.md">中文</a>
</div>

# Coordinator Event Log — Compaction-Resistant Multi-Agent Communication Design

> CCP v2.6.11 · 2026-06-11 · Fully Implemented

---

## 1. The Problem: Compaction Silently Evicts Shared Context

Claude Code's Agent Teams (multi-worker orchestration) has a structural flaw: **each worker agent's conversation context is independent. When compaction fires, the shared consensus — decisions made, partial results, retry state — is silently lost as old messages are replaced by summaries.**

This isn't Anthropic's bug — it's inherent to the agent-as-function-call paradigm. When a coordinator forks a worker, the worker returns results, and the coordinator decides the next step, all this information lives inside the LLM's token window. Window fills → compaction → old messages compressed into summaries → worker intermediate products (partial results, understanding, error recovery paths) are discarded.

CCB community Issue #23620 documents this: **team context lost after compaction.**

Our core insight: **context and state are two different things and don't belong in the same container.** The LLM's token window is a context container — unsuitable for storing state. An independent state container, immune to compaction, is needed.

---

## 2. Solution: Event Sourcing

We chose event sourcing, not a scratchpad.

### Why not a scratchpad?

An earlier idea had the coordinator write a state summary at each turn's end — a "snapshot" approach. Problems:
1. Snapshots are **after-the-fact**. If compaction fires before the summary is written, the gap is permanent
2. Snapshots are the coordinator's **subjective summary**, not objective fact — the coordinator may omit critical details
3. Snapshots are **not auditable**. When something goes wrong, you can't answer "which worker returned what result when"

### Event sourcing advantages

The core principle: **don't store results — store what happened.**

```
worker_spawned("analyzer") → worker_result("analyzer", {...}) → synthesis(...) → decision("proceed")
```

Every action writes an event immediately, before the next LLM turn. When compaction arrives, the coordinator folds the event log back into a complete team state.

| Approach | Write timing | Compaction-safe | Auditable | Recoverable |
|----------|-------------|:---:|:---:|:---:|
| Scratchpad | After-the-fact | ❌ Can be preempted | ❌ Subjective summary | ❌ Information loss |
| Event Sourcing | Immediate | ✅ Events already on disk | ✅ Full audit trail | ✅ Fold recovery |

---

## 3. Architecture

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
│                                   → inject restored context  │
└─────────────────────────────────────────────────────────────┘
```

### 6 Event Types

| Event | Carries | Trigger |
|-------|---------|---------|
| `session_started` | coordinatorId, sessionId, version | New session start |
| `worker_spawned` | workerId, task description | AgentTool fork |
| `worker_result` | workerId, result summary, exit code | Worker returns |
| `synthesis` | `<coordinator-synthesis>` XML content | Extracted from LLM output each turn |
| `decision` | `<decision>` XML content | Same as above |
| `checkpoint` | Full TeamProjection state | Written after compaction completes |

### Projection (fold-based)

```typescript
const teamState = events.reduce(applyEvent, initialState)
// initialState = { sessionId, workers: {}, decisions: [], checkpointId: null }
```

Not a full fold from scratch every time — a checkpoint is a snapshot at a point in time. Recovery starts from the nearest checkpoint snapshot and only folds events after it.

### Lifecycle

```
session start → write session_started
    ↓
spawn worker_a → write worker_spawned
    ↓
worker_a returns → write worker_result
    ↓
LLM outputs synthesis + decision → write synthesis, decision
    ↓
... multiple turn cycles ...
    ↓
compaction → TeamProjection.fold() → write checkpoint → clear(before checkpoint)
    ↓
session end → clear() (full cleanup)
```

---

## 4. Implementation Details

### Storage: Two Backends

| Backend | Format | Use case |
|---------|--------|----------|
| `LocalFileEventStore` | JSONL under `.team-events/` | Single-machine coordinator |
| `RemoteEventStore` | HTTP client, GET/POST/DELETE `/events` | Cross-machine coordinator |

Auto-switch via `eventStoreInstance.ts` detecting `TEAM_EVENT_SERVER_URL`:

```typescript
export const eventStore = TEAM_EVENT_SERVER_URL
  ? new RemoteEventStore(TEAM_EVENT_SERVER_URL)
  : new LocalFileEventStore(teamStoreDir)
```

### HTTP Server (Cross-Machine)

```
Bun.serve on port 9742:
  GET    /events           → read all events
  POST   /events           → append event
  DELETE /events?before=t  → clear events before timestamp
```

Zero external dependencies — all Bun built-in APIs (`Bun.serve` + `fetch`).

### XML Tag Extraction

Synthesis and Decision aren't left to LLM "initiative" — XML tag instructions are injected into the system prompt, then extracted via regex:

```typescript
const synthesis = extractXmlTag(response, 'coordinator-synthesis')
const decision = extractXmlTag(response, 'decision')
```

If the LLM doesn't output the expected tag, the event records an empty string — never blocks the flow.

### Compaction Injection Point

Not a post-hoc injection — `buildPostCompactMessages` signature was modified to accept `teamContext`:

```typescript
// Before
buildPostCompactMessages(compacted: Message[]): Message[]

// After
buildPostCompactMessages(compacted: Message[], teamContext?: TeamState): Message[]
```

When compaction finishes, the EventStore projects `teamContext`, renders it as readable Markdown, and inserts it at the end of the compressed system prompt.

---

## 5. Test Strategy

| Layer | File | Coverage |
|-------|------|----------|
| Unit | `teamProjection.test.ts` | Fold logic, checkpoint recovery, XML rendering |
| Unit | `remoteEventStore.test.ts` | HTTP client behavior |
| Integration | `coordinator-event-log.test.ts` | Full EventStore lifecycle |
| Smoke | `smoke_event_log.test.ts` | Multi-worker end-to-end |
| E2E | `e2e_lifecycle_test.ts` | Cross-machine: Machine A writes → Machine B reads → project → checkpoint → clear → resume |

Verified scenarios:
- Events written → immediate projection produces correct team state
- After checkpoint, clear(before) retains only post-checkpoint events
- Session-end clear() fully cleans up
- Cross-machine HTTP read/write consistency

---

## 6. Why Not Called a "Memory System"

CCP inherits Anthropic's industrial-grade memory system (EXTRACT_MEMORIES / autoDream / LODESTONE), which handles **cross-session personal knowledge management** — "what build tool does this project use", "where is the user's API key stored."

Coordinator Event Log solves a completely different problem: **intra-session multi-worker orchestration context persistence** — "what did worker A just return", "which retry round are we on", "what was the coordinator's last decision."

The relationship and distinction:

| | Memory System | Coordinator Event Log |
|---|---|---|
| Timespan | Cross-session (days/months) | Intra-session (minutes/hours) |
| Content | Personal knowledge | Worker state, decision chain |
| Retrieval | LODESTONE relevance scoring | Fold projection |
| Lifecycle | Permanent | Cleared at session end |
| Writer | Background agent (autoDream) | Coordinator agent (synchronous writes) |
| Design pattern | ETL pipeline | Event Sourcing |

They coexist without conflict. Coordinator Event Log is working memory; Memory System is persistent knowledge.

---

## 7. Known Limitations & Future Directions

| Limitation | Detail |
|------------|--------|
| No concurrency safety | Multiple coordinators writing to the same RemoteEventStore have no locking (design assumption: one coordinator per session) |
| No event compression | Large numbers of worker_spawned/results events produce many JSONL lines (tradeoff: clear(before) after compaction reclaims old events) |
| CCP-only readable | Event format is CCP-internal; external agents (Hermes, Codex) need an adapter layer |
| No event streaming | No SSE/WebSocket push to other coordinators (current model is pull) |

### Future Directions

- **Event compression (snapshot)**: Auto-merge same-type events at compaction (e.g., 10 worker_results → 1 snapshot)
- **Cross-ecosystem bridge**: A2A protocol event adapter, letting Hermes coordinators consume CCP event streams
- **Event pagination**: When a single session exceeds 1,000 events, cursor-based pagination for read()
- **Pre-write A/B verification**: Use Claude models to verify synthesis/decision extraction completeness before writing events

---

## 8. Relationship to Hermes

Hermes' Kanban system (`kanban_db.py`) uses SQLite for multi-worker state sharing — dispatcher assigns tasks, workers claim them, comments bridge communication. Issues:
1. Dispatcher is a dumb process — it doesn't understand task semantics
2. Workers can't communicate directly with each other
3. No concept of compaction (Hermes doesn't use LLM as an agent-loop coordinator)

CCP's Coordinator Event Log fills the "agent coordinator + compaction-resistant state" gap. The intersection point is worth a Hermes RFC proposal — bringing CCP's coordinator + event sourcing approach into Hermes Kanban, upgrading the dispatcher from a dumb process to a true agent.

---

## Appendix: File Manifest

```
src/coordinator/
  teamEventStore.ts          EventStore interface + LocalFileEventStore
  teamProjection.ts          Fold-based projection + XML renderer
  eventStoreInstance.ts      Singleton + auto-switch (Local/Remote)
  remoteEventStore.ts        HTTP client
  eventHttpServer.ts         Bun.serve HTTP server (port 9742)
  eventHttpServerEntry.ts    Standalone launch entry
  coordinatorMode.ts         Session start + checkpoint + clear lifecycle
  e2e_lifecycle_test.ts      Cross-machine E2E
  __tests__/
    teamProjection.test.ts   Unit
    remoteEventStore.test.ts Unit
    smoke_event_log.test.ts  Integration
    coordinator-event-log.test.ts  Integration
src/query.ts                 Synthesis/decision extraction + compaction trigger
src/services/compact/compact.ts  buildPostCompactMessages signature extension
packages/agent.tool/AgentTool.tsx  Spawn event hook
packages/agent.tool/LocalAgentTask.tsx  Result event hook
tests/integration/remote-coordinator-event-log.test.ts  Cross-machine integration test
docs/plans/2026-06-11-coordinator-event-log.md          Development plan
```

Total: ~1,400 lines TypeScript + ~800 lines tests.
