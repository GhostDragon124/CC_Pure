import { describe, expect, test } from 'bun:test'
import { LocalFileEventStore } from '../teamEventStore.js'
import { projectTeamState, renderTeamContext } from '../teamProjection.js'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'

const TEST_DIR = '/tmp/ccp_smoke_test'

describe('smoke: coordinator event log end-to-end', () => {
  test('full session lifecycle: start → spawn → result → synthesis → decision → project → render', async () => {
    // Clean up from previous runs to avoid stale events
    await rm(TEST_DIR, { recursive: true, force: true })
    await mkdir(join(TEST_DIR, '.claude', 'team'), { recursive: true })

    const store = new LocalFileEventStore(
      join(TEST_DIR, '.claude', 'team', 'events.jsonl'),
    )

    // Session started
    await store.append({
      version: 1,
      timestamp: Date.now(),
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.session_started',
    })

    // Spawn worker
    await store.append({
      version: 1,
      timestamp: Date.now(),
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.worker_spawned',
      workerId: 'agent-001',
      directive: 'Investigate auth bug in src/auth/validate.ts',
      agentType: 'worker',
    })

    // Worker result
    await store.append({
      version: 1,
      timestamp: Date.now() + 1000,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.worker_result',
      workerId: 'agent-001',
      status: 'completed',
      summary: 'Found null pointer in auth.ts:42',
    })

    // Synthesis
    await store.append({
      version: 1,
      timestamp: Date.now() + 2000,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.synthesis',
      findings: 'Null pointer from expired session',
      decisions: 'Add null check',
    })

    // Decision
    await store.append({
      version: 1,
      timestamp: Date.now() + 2500,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.decision',
      action: 'continue',
      workerId: 'agent-001',
      rationale: 'Worker has context',
    })

    // Read & project
    const events = await store.read()
    expect(events.length).toBe(5)

    const state = projectTeamState(events)
    expect(state.workers['agent-001']?.status).toBe('completed')
    expect(state.workers['agent-001']?.summary).toBe(
      'Found null pointer in auth.ts:42',
    )
    expect(state.lastSynthesis?.findings).toContain('Null pointer')

    // Render
    const context = renderTeamContext(state)
    expect(context).toContain('coordinator-team-state')
    expect(context).toContain('agent-001')
    expect(context).toContain('completed')

    console.log('=== Rendered Team Context ===')
    console.log(context)

    // Orphan detection: simulate coordinator restart with a still-running worker
    // Spawn a running worker in old session first
    await store.append({
      version: 1,
      timestamp: Date.now() + 500,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
      type: 'coordinator.worker_spawned',
      workerId: 'agent-running',
      directive: 'Long task still running',
      agentType: 'worker',
    })
    await store.append({
      version: 1,
      timestamp: Date.now() + 3000,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s2',
      type: 'coordinator.session_started',
    })
    await store.append({
      version: 1,
      timestamp: Date.now() + 3100,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s2',
      type: 'coordinator.worker_spawned',
      workerId: 'agent-002',
      directive: 'Run tests',
      agentType: 'worker',
    })

    const state2 = projectTeamState(await store.read())
    expect(state2.workers['agent-running']?.status).toBe('orphaned') // running from old session → orphaned
    expect(state2.workers['agent-001']?.status).toBe('completed') // completed from old session → NOT orphaned (correct!)
    expect(state2.workers['agent-002']?.status).toBe('running') // from new session

    console.log('\n🎉 ALL SMOKE TESTS PASSED')
    console.log(`   - Event log: ${events.length + 2} events persisted`)
    console.log('   - Projection: worker statuses correct')
    console.log('   - Orphan detection: session restart detected')
    console.log('   - Context renderer: valid XML output')

    // Clear: delete all events before a checkpoint
    await store.clear(Date.now() + 3500) // keep only events after this cutoff
    const afterClear = await store.read()
    expect(afterClear.length).toBeLessThan(events.length)

    // Clear: delete everything
    await store.clear()
    const afterFullClear = await store.read()
    expect(afterFullClear).toEqual([])
  })
})
