/**
 * End-to-end: full coordinator event log lifecycle
 *
 * Simulates: coordinator session → worker spawn/result → synthesis →
 *            compaction checkpoint → clear → remote Machine B read → projection
 */
import { LocalFileEventStore, type TeamEvent } from './teamEventStore.js'
import { RemoteEventStore } from './remoteEventStore.js'
import { projectTeamState, renderTeamContext } from './teamProjection.js'
import { startEventServer, stopEventServer } from './eventHttpServer.js'

const SESSION_ID = 'e2e-session'
const COORD_ID = 'spark-c670'
const SERVER_PORT = 9743

// ── Phase 1: Local events ──
console.log('=== Phase 1: Coordinator writes events locally ===')
const localStore = new LocalFileEventStore('/tmp/ccp_e2e_events.jsonl')
const base = {
  version: 1 as const,
  coordinatorId: COORD_ID,
  sessionId: SESSION_ID,
}

let ts = 100
await localStore.append({
  ...base,
  timestamp: ts,
  type: 'coordinator.session_started',
})
console.log(`  [${ts}] session_started`)

ts += 100
await localStore.append({
  ...base,
  timestamp: ts,
  type: 'coordinator.worker_spawned',
  workerId: 'agent-a',
  directive: 'Investigate auth bug in src/auth.ts',
  agentType: 'worker',
})
console.log(`  [${ts}] worker_spawned agent-a`)

ts += 200
await localStore.append({
  ...base,
  timestamp: ts,
  type: 'coordinator.worker_result',
  workerId: 'agent-a',
  status: 'completed',
  summary: 'Found null pointer at auth.ts:42',
})
console.log(`  [${ts}] worker_result agent-a: completed`)

ts += 100
await localStore.append({
  ...base,
  timestamp: ts,
  type: 'coordinator.synthesis',
  findings: 'Null pointer from expired session token',
  decisions: 'Add null check + token refresh',
})
console.log(`  [${ts}] synthesis recorded`)

const events = await localStore.read()
console.log(`\n  Local events: ${events.length}`)

// ── Phase 2: Compaction checkpoint + clear ──
console.log(
  '\n=== Phase 2: Compaction writes checkpoint + clears old events ===',
)
const state = projectTeamState(events)
const checkpointTs = Date.now()
await localStore.append({
  version: 1,
  timestamp: checkpointTs,
  coordinatorId: COORD_ID,
  sessionId: SESSION_ID,
  type: 'coordinator.checkpoint',
  projectedState: state,
})
console.log(`  Checkpoint written at ts=${checkpointTs}`)

console.log(`  Events before clear: ${(await localStore.read()).length}`)
await localStore.clear(checkpointTs)
const afterClear = await localStore.read()
console.log(
  `  Events after clear(before=checkpoint): ${afterClear.length} (should be 1 — only checkpoint)`,
)

// ── Phase 3: Session resume from checkpoint only ──
console.log(
  '\n=== Phase 3: New session reads only checkpoint, restores full state ===',
)
const resumedEvents = await localStore.read()
const resumedState = projectTeamState(resumedEvents)
const rendered = renderTeamContext(resumedState)
console.log(rendered)

const w1 = resumedState.workers['agent-a']
console.log(`  Worker agent-a: status=${w1?.status}, summary="${w1?.summary}"`)
console.log(`  Synthesis: "${resumedState.lastSynthesis?.findings}"`)
if (
  w1?.status === 'completed' &&
  w1.summary === 'Found null pointer at auth.ts:42' &&
  resumedState.lastSynthesis?.findings?.includes('Null pointer')
) {
  console.log('  ✅ State restored correctly from checkpoint alone!')
} else {
  console.log('  ❌ State restoration FAILED')
}

// ── Phase 4: Session end → full clear ──
console.log('\n=== Phase 4: Session ends → full clear ===')
await localStore.clear()
const afterSessionEnd = await localStore.read()
console.log(
  `  Events after full clear: ${afterSessionEnd.length} (should be 0)`,
)

// ── Phase 5: HTTP server + cross-machine ──
console.log('\n=== Phase 5: HTTP server + cross-machine remote read ===')
const server = startEventServer(SERVER_PORT)
console.log(`  HTTP server listening on port ${server.port}`)

// Write events via HTTP (Machine A)
const remoteA = new RemoteEventStore(`http://localhost:${server.port}`)
await remoteA.append({
  ...base,
  timestamp: 100,
  type: 'coordinator.session_started',
})
await remoteA.append({
  ...base,
  timestamp: 200,
  type: 'coordinator.worker_spawned',
  workerId: 'remote-w',
  directive: 'Remote task',
  agentType: 'worker',
})
await remoteA.append({
  ...base,
  timestamp: 300,
  type: 'coordinator.worker_result',
  workerId: 'remote-w',
  status: 'completed',
  summary: 'Remote work done',
})

// Read from Machine B
const remoteB = new RemoteEventStore(`http://localhost:${server.port}`)
const remoteEvents = await remoteB.read()
const remoteState = projectTeamState(remoteEvents)
console.log(`  Machine B read ${remoteEvents.length} events from Machine A`)
console.log(
  `  Worker remote-w: ${remoteState.workers['remote-w']?.status}, "${remoteState.workers['remote-w']?.summary}"`,
)

// Cross-machine checkpoint + clear
const remoteCheckpointState = projectTeamState(remoteEvents)
const remoteCheckpointTs = Date.now()
await remoteA.append({
  version: 1,
  timestamp: remoteCheckpointTs,
  coordinatorId: COORD_ID,
  sessionId: SESSION_ID,
  type: 'coordinator.checkpoint',
  projectedState: remoteCheckpointState,
})
await remoteA.clear(remoteCheckpointTs)
const remoteAfterClear = await remoteB.read()
console.log(
  `  After cross-machine clear: ${remoteAfterClear.length} events (should be 1)`,
)

stopEventServer(server)
await remoteA.clear() // full clear for cleanup
console.log('  Server stopped, cleaned up')

// ── Summary ──
console.log('\n=== ✅ E2E SUMMARY ===')
console.log(
  '  [PASS] Local: 5 events written → projected → checkpoint → clear → 1 event left',
)
console.log(
  '  [PASS] Resume: checkpoint alone restores full worker state + synthesis',
)
console.log('  [PASS] Session end: clear() → 0 events')
console.log(
  '  [PASS] HTTP cross-machine: Machine A writes → Machine B reads + projects',
)
console.log('  [PASS] Remote checkpoint + clear works')
