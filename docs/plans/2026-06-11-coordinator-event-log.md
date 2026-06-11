# Coordinator Event Log — Phase 1 Implementation Plan (Claude-reviewed)

> **Status:** Ready for Codex execution
> **Model:** deepseek-v4-flash
> **Reviewer:** Hermes (code review + integration check)
> **Estimated:** ~400 lines new code

**Goal:** 在 CCP coordinator 上实现 event sourcing 的 compaction-resistant team state，Phase 1 聚焦本地单机

---

## Architecture Decisions (made now, used in Phase 2)

1. **EventStore interface** — not hardcoded file I/O. Phase 2 adds `RemoteEventStore` with zero refactoring.
2. **version + coordinatorId** in every event — schema evolution + multi-observer ready.
3. **Fold-based projection** — `events.reduce(applyEvent, init)`. Phase 2 incremental is one-line change.
4. **Explicit XML tags** — `<coordinator-synthesis>` and `<decision>` in system prompt, not heuristics.
5. **Inject into buildPostCompactMessages** — modify its signature, not post-hoc mutation.

---

## Task 1: EventStore interface + LocalFileEventStore

**Create:** `src/coordinator/teamEventStore.ts`

```typescript
// ── Interface ──
export interface EventStore {
  append(event: TeamEvent): Promise<void>
  read(since?: number): Promise<TeamEvent[]>
}

// ── Local file implementation ──
export class LocalFileEventStore implements EventStore {
  private path: string
  constructor(path?: string)
  async append(event: TeamEvent): Promise<void>
  async read(since?: number): Promise<TeamEvent[]>
}
```

- Store path: `~/.claude/team/events.jsonl` (from `getCwd()`)
- Append: `await appendFile(path, JSON.stringify(event) + '\n')`
- Read: read file, split by newline, parse, filter by `since` timestamp
- Graceful degradation: append failure → `logForDebugging`, don't crash
- Auto-create directory on first write

---

## Task 2: Event type definitions

**Modify:** `src/coordinator/teamEventStore.ts` (add types at top)

```typescript
type BaseEvent = {
  version: 1
  timestamp: number       // Date.now() at write time
  coordinatorId: string   // from process.env or hostname
  sessionId: string
}

export type WorkerSpawnedEvent = BaseEvent & {
  type: 'coordinator.worker_spawned'
  workerId: string
  directive: string       // first 200 chars
  agentType: string
}

export type WorkerResultEvent = BaseEvent & {
  type: 'coordinator.worker_result'
  workerId: string
  status: 'completed' | 'failed' | 'killed'
  summary: string         // first 200 chars
}

export type CoordinatorSynthesisEvent = BaseEvent & {
  type: 'coordinator.synthesis'
  findings: string
  decisions: string
}

export type CoordinatorDecisionEvent = BaseEvent & {
  type: 'coordinator.decision'
  decision: 'continue' | 'spawn_fresh'
  workerId: string
  reason: string
}

export type CoordinatorSessionStartedEvent = BaseEvent & {
  type: 'coordinator.session_started'
  // Marks session start for orphan worker detection
}

export type CheckpointEvent = BaseEvent & {
  type: 'coordinator.checkpoint'
  projectedState: TeamState
}

export type TeamEvent =
  | WorkerSpawnedEvent
  | WorkerResultEvent
  | CoordinatorSynthesisEvent
  | CoordinatorDecisionEvent
  | CoordinatorSessionStartedEvent
  | CheckpointEvent
```

---

## Task 3: Projection builder (fold-based)

**Create:** `src/coordinator/teamProjection.ts`

```typescript
import type { TeamEvent } from './teamEventStore.js'

export type TeamState = {
  workers: Record<string, {
    directive: string
    agentType: string
    status: 'running' | 'completed' | 'failed' | 'killed' | 'orphaned'
    startTime: number
    endTime?: number
    summary?: string
    sessionId: string
  }>
  lastSynthesis?: {
    findings: string
    decisions: string
    timestamp: number
  }
}

function initialTeamState(): TeamState {
  return { workers: {} }
}

function applyEvent(state: TeamState, event: TeamEvent): TeamState {
  // Version gate
  if (event.version > 1) return state

  switch (event.type) {
    case 'coordinator.session_started':
      // Mark workers from old sessions as orphaned
      return {
        ...state,
        workers: Object.fromEntries(
          Object.entries(state.workers).map(([id, w]) =>
            w.sessionId !== event.sessionId && w.status === 'running'
              ? [id, { ...w, status: 'orphaned' }]
              : [id, w]
          )
        )
      }
    case 'coordinator.worker_spawned':
      return {
        ...state,
        workers: {
          ...state.workers,
          [event.workerId]: {
            directive: event.directive,
            agentType: event.agentType,
            status: 'running',
            startTime: event.timestamp,
            sessionId: event.sessionId,
          }
        }
      }
    case 'coordinator.worker_result':
      if (!state.workers[event.workerId]) return state
      return {
        ...state,
        workers: {
          ...state.workers,
          [event.workerId]: {
            ...state.workers[event.workerId],
            status: event.status,
            endTime: event.timestamp,
            summary: event.summary,
          }
        }
      }
    case 'coordinator.synthesis':
      return {
        ...state,
        lastSynthesis: {
          findings: event.findings,
          decisions: event.decisions,
          timestamp: event.timestamp,
        }
      }
    case 'coordinator.decision':
      // Decision events are informational, stored in lastSynthesis context
      return state
    case 'coordinator.checkpoint':
      return event.projectedState
    default:
      return state
  }
}

export function projectTeamState(events: TeamEvent[]): TeamState {
  return events.reduce(applyEvent, initialTeamState())
}
```

---

## Task 4: Context renderer + buildPostCompactMessages integration

**Modify:** `src/coordinator/teamProjection.ts` (add renderer)
**Modify:** `src/services/compact/compact.ts` (modify buildPostCompactMessages signature)

```typescript
// Renderer
export function renderTeamContext(state: TeamState): string {
  const activeWorkers = Object.entries(state.workers)
    .filter(([_, w]) => w.status === 'running')
  const completedWorkers = Object.entries(state.workers)
    .filter(([_, w]) => ['completed', 'failed'].includes(w.status))
  const orphanedWorkers = Object.entries(state.workers)
    .filter(([_, w]) => w.status === 'orphaned')

  const lines: string[] = [
    '<coordinator-team-state>',
    `Last updated: ${new Date().toISOString()}`,
    '',
  ]

  if (activeWorkers.length > 0) {
    lines.push('Active workers:')
    for (const [id, w] of activeWorkers) {
      const elapsed = Math.round((Date.now() - w.startTime) / 1000)
      lines.push(`  ${id}: ${w.directive} (running ${elapsed}s)`)
    }
    lines.push('')
  }

  if (completedWorkers.length > 0) {
    lines.push('Completed workers:')
    for (const [id, w] of completedWorkers) {
      lines.push(`  ${id} [${w.status}]: ${w.summary || '(no summary)'}`)
    }
    lines.push('')
  }

  if (orphanedWorkers.length > 0) {
    lines.push('⚠ Orphaned workers (coordinator restarted):')
    for (const [id, w] of orphanedWorkers) {
      lines.push(`  ${id}: ${w.directive}`)
    }
    lines.push('')
  }

  if (state.lastSynthesis) {
    lines.push(`Last synthesis: ${state.lastSynthesis.findings}`)
    lines.push(`Decisions: ${state.lastSynthesis.decisions}`)
    lines.push('')
  }

  lines.push('</coordinator-team-state>')
  return lines.join('\n')
}
```

**Important:** Modify `buildPostCompactMessages` (in `src/services/compact/compact.ts`) to accept optional `teamContext?: string` parameter, append it as the last system message in postCompactMessages.

---

## Task 5: Coordinator system prompt update (add XML tags)

**Modify:** `src/coordinator/coordinatorMode.ts` `getCoordinatorSystemPrompt()`

Add to Section 1 (Your Role) or Section 5 (Writing Worker Prompts):

```
## Coordinator State Tags

To help the system track your decisions, wrap synthesis and decisions in explicit tags:

When you synthesize worker findings:
<coordinator-synthesis>
Brief summary of what you learned and what you decided.
</coordinator-synthesis>

When you decide to continue a worker:
<decision action="continue" worker="<agent-id>">
Why you're continuing this worker instead of spawning fresh.
</decision>

When you decide to spawn a fresh worker:
<decision action="spawn">
Why a fresh worker is better than continuing an existing one.
</decision>
```

---

## Task 6: Spawn event hook (AgentTool)

**Modify:** `packages/builtin-tools/src/tools/AgentTool/AgentTool.tsx`

After `registerAsyncAgent` call (around line 954), in coordinator mode:

```typescript
if (isCoordinatorMode()) {
  const store = getEventStore() // from singleton or context
  store.append({
    version: 1,
    timestamp: Date.now(),
    coordinatorId: getCoordinatorId(),
    sessionId: toolUseContext.sessionId,
    type: 'coordinator.worker_spawned',
    workerId: agentId,
    directive: (promptParam || description || '').slice(0, 200),
    agentType: selectedAgent?.agentType || 'worker',
  }).catch(() => { /* fire-and-forget */ })
}
```

---

## Task 7: Result event hook (LocalAgentTask)

**Modify:** `src/tasks/LocalAgentTask/LocalAgentTask.tsx`

In `enqueueAgentNotification`, after notification is enqueued:

```typescript
if (isCoordinatorMode()) {
  const store = getEventStore()
  store.append({
    version: 1,
    timestamp: Date.now(),
    coordinatorId: getCoordinatorId(),
    sessionId: 'coordinator', // worker doesn't have session context
    type: 'coordinator.worker_result',
    workerId: taskId,
    status,
    summary: (finalMessage || error || '').slice(0, 200),
  }).catch(() => { /* fire-and-forget */ })
}
```

---

## Task 8: Synthesis extraction hook (query.ts)

**Modify:** `src/query.ts`

After assistant message is received and before tool calls execute:

```typescript
// Extract <coordinator-synthesis> from assistant message text
const synthesisMatch = assistantText.match(/<coordinator-synthesis>([\s\S]*?)<\/coordinator-synthesis>/)
if (synthesisMatch && isCoordinatorMode()) {
  const store = getEventStore()
  store.append({
    version: 1,
    timestamp: Date.now(),
    coordinatorId: getCoordinatorId(),
    sessionId: toolUseContext.sessionId,
    type: 'coordinator.synthesis',
    findings: synthesisMatch[1].trim().slice(0, 500),
    decisions: '', // decisions come from decision tags
  }).catch(() => {})
}
```

---

## Task 9: Decision extraction hook (query.ts)

**Same location** as synthesis:

```typescript
const decisionMatch = assistantText.match(/<decision action="(continue|spawn)"(?:\s+worker="([^"]*)")?>([\s\S]*?)<\/decision>/)
if (decisionMatch && isCoordinatorMode()) {
  const store = getEventStore()
  store.append({
    version: 1,
    timestamp: Date.now(),
    coordinatorId: getCoordinatorId(),
    sessionId: toolUseContext.sessionId,
    type: 'coordinator.decision',
    decision: decisionMatch[1] as 'continue' | 'spawn',
    workerId: decisionMatch[2] || '',
    reason: decisionMatch[3].trim().slice(0, 300),
  }).catch(() => {})
}
```

---

## Task 10: Session started event hook

**Modify:** `src/coordinator/coordinatorMode.ts`

In `matchSessionMode` (or wherever coordinator mode is first activated for a session):

```typescript
const store = getEventStore()
store.append({
  version: 1,
  timestamp: Date.now(),
  coordinatorId: getCoordinatorId(),
  sessionId: currentSessionId,
  type: 'coordinator.session_started',
}).catch(() => {})
```

---

## Task 11: Post-compaction recovery (modify buildPostCompactMessages)

**Modify:** `src/services/compact/compact.ts`

Add parameter to `buildPostCompactMessages`:
```typescript
export function buildPostCompactMessages(
  compactionResult: CompactionResult,
  teamContext?: string  // NEW
): Message[]
```

If `teamContext` is provided, append as a system message at the end.

**Modify:** `src/query.ts` (around line 642)

```typescript
// Before buildPostCompactMessages
let teamContext: string | undefined
if (isCoordinatorMode()) {
  const store = getEventStore()
  const events = await store.read()
  if (events.length > 0) {
    const state = projectTeamState(events)
    teamContext = renderTeamContext(state)
  }
}

const postCompactMessages = buildPostCompactMessages(compactionResult, teamContext)
```

---

## Task 12: Session resume recovery

**Modify:** `src/coordinator/coordinatorMode.ts` `matchSessionMode()`

After mode is matched on resume:

```typescript
// On coordinator session resume, inject team context
if (isCoordinatorMode()) {
  const store = getEventStore()
  const events = await store.read()
  if (events.length > 0) {
    const state = projectTeamState(events)
    // Inject as queued command or meta message
    injectTeamContextOnResume(state)
  }
}
```

---

## Task 13: EventStore singleton

**Create:** `src/coordinator/eventStoreInstance.ts`

```typescript
import { EventStore, LocalFileEventStore } from './teamEventStore.js'

let _store: EventStore | null = null

export function getEventStore(): EventStore {
  if (!_store) {
    _store = new LocalFileEventStore()
  }
  return _store
}

// For testing
export function setEventStore(store: EventStore): void {
  _store = store
}

export function getCoordinatorId(): string {
  return process.env.COORDINATOR_ID || require('os').hostname()
}
```

---

## Task 14: Unit tests

**Create:** `src/coordinator/__tests__/teamProjection.test.ts`

Test cases:
- spawn + complete → state shows completed
- spawn + fail → state shows failed
- orphan detection: session_started marks old running workers as orphaned
- fold identity: `projectTeamState([])` equals `initialTeamState()`
- renderer: contains worker IDs, statuses, timestamps
- checkpoint: projection uses checkpoint state

---

## Task 15: Integration test

**Create:** `tests/integration/coordinator-event-log.test.ts`

```typescript
class MockEventStore implements EventStore {
  events: TeamEvent[] = []
  async append(event: TeamEvent) { this.events.push(event) }
  async read(since?: number) {
    return since ? this.events.filter(e => e.timestamp > since) : [...this.events]
  }
}

// Test: spawn 2 workers → complete 1 → compact → recover → verify state
```

---

## Task 16: Metrics

In each hook, add:
```typescript
logEvent('tengu_coordinator_event_written', {
  eventType: event.type,
  coordinatorId: event.coordinatorId,
})
```

In post-compaction recovery:
```typescript
logEvent('tengu_coordinator_projection_recovered', {
  eventCount: events.length,
  activeWorkers: Object.values(state.workers).filter(w => w.status === 'running').length,
})
```

---

## Task 17: Run precheck + manual smoke test

```bash
cd /home/spark/workspace/CC_Pure
bun run precheck

# Start coordinator mode with deepseek-v4-flash
FEATURE_COORDINATOR_MODE=1 CLAUDE_CODE_COORDINATOR_MODE=1 bun run dev

# Spawn workers, verify events.jsonl, trigger compaction, verify recovery
```

---

## Files Summary

| File | Action | Lines |
|------|--------|-------|
| `src/coordinator/teamEventStore.ts` | Create | ~100 |
| `src/coordinator/teamProjection.ts` | Create | ~120 |
| `src/coordinator/eventStoreInstance.ts` | Create | ~20 |
| `src/coordinator/coordinatorMode.ts` | Modify | +30 |
| `src/query.ts` | Modify | +40 |
| `src/services/compact/compact.ts` | Modify | +10 |
| `AgentTool.tsx` | Modify | +15 |
| `LocalAgentTask.tsx` | Modify | +15 |
| `src/coordinator/__tests__/teamProjection.test.ts` | Create | ~100 |
| `tests/integration/coordinator-event-log.test.ts` | Create | ~80 |
| **Total** | | **~530** |
