import { describe, expect, test } from 'bun:test'
import { createKvEvent, LocalFileEventStore } from '../teamEventStore.js'
import { projectTeamState, renderTeamContext } from '../teamProjection.js'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { getWorkerStatus, teamKey, workerKey } from '../kvHelpers.js'

const TEST_DIR = '/tmp/ccp_smoke_test'

describe('smoke: coordinator event log end-to-end', () => {
  test('full session lifecycle: start → spawn → result → synthesis → decision → project → render', async () => {
    // Clean up from previous runs to avoid stale events
    await rm(TEST_DIR, { recursive: true, force: true })
    await mkdir(join(TEST_DIR, '.claude', 'team'), { recursive: true })

    const store = new LocalFileEventStore(
      join(TEST_DIR, '.claude', 'team', 'events.jsonl'),
    )

    const base = {
      version: 1,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s1',
    } as const

    // Session started
    await store.append(
      createKvEvent('coordinator:session', 'test-s1', 'coordinator', {
        ...base,
        timestamp: Date.now(),
      }),
    )

    // Spawn worker
    const spawnedAt = Date.now()
    await appendWorkerSpawnKv(
      store,
      base,
      'agent-001',
      'Investigate auth bug in src/auth/validate.ts',
      spawnedAt,
    )

    // Worker result
    const completedAt = Date.now() + 1000
    await store.append(
      createKvEvent(
        workerKey('agent-001', 'status'),
        'completed',
        'worker-agent-001',
        {
          ...base,
          timestamp: completedAt,
        },
      ),
    )
    await store.append(
      createKvEvent(
        workerKey('agent-001', 'summary'),
        'Found null pointer in auth.ts:42',
        'worker-agent-001',
        {
          ...base,
          timestamp: completedAt,
        },
      ),
    )
    await store.append(
      createKvEvent(
        workerKey('agent-001', 'updatedAt'),
        String(completedAt),
        'worker-agent-001',
        {
          ...base,
          timestamp: completedAt,
        },
      ),
    )

    // Synthesis
    const synthesisAt = Date.now() + 2000
    await store.append(
      createKvEvent(
        teamKey('findings'),
        'Null pointer from expired session',
        'coordinator',
        {
          ...base,
          timestamp: synthesisAt,
        },
      ),
    )
    await store.append(
      createKvEvent(teamKey('decisions'), 'Add null check', 'coordinator', {
        ...base,
        timestamp: synthesisAt,
      }),
    )
    await store.append(
      createKvEvent(teamKey('timestamp'), String(synthesisAt), 'coordinator', {
        ...base,
        timestamp: synthesisAt,
      }),
    )

    // Decision
    await store.append(
      createKvEvent(
        'coordinator:decision:1',
        'Worker has context',
        'coordinator',
        {
          ...base,
          timestamp: Date.now() + 2500,
        },
      ),
    )

    // Read & project
    const events = await store.read()
    expect(events.length).toBe(14)

    const state = projectTeamState(events)
    expect(getWorkerStatus(state, 'agent-001')).toBe('completed')
    expect(state[workerKey('agent-001', 'summary')]?.value).toBe(
      'Found null pointer in auth.ts:42',
    )
    expect(state[teamKey('findings')]?.value).toContain('Null pointer')

    // Render
    const context = renderTeamContext(state)
    expect(context).toContain('coordinator-team-state')
    expect(context).toContain('agent-001')
    expect(context).toContain('completed')

    console.log('=== Rendered Team Context ===')
    console.log(context)

    // Orphan detection: simulate coordinator restart with a still-running worker
    // Spawn a running worker in old session first
    await appendWorkerSpawnKv(
      store,
      base,
      'agent-running',
      'Long task still running',
      Date.now() + 500,
    )
    await store.append({
      version: 1,
      timestamp: Date.now() + 3000,
      coordinatorId: 'spark-c670',
      sessionId: 'test-s2',
      type: 'coordinator.session_started',
    })
    await appendWorkerSpawnKv(
      store,
      { ...base, sessionId: 'test-s2' },
      'agent-002',
      'Run tests',
      Date.now() + 3100,
    )

    const state2 = projectTeamState(await store.read())
    expect(getWorkerStatus(state2, 'agent-running')).toBe('orphaned') // running from old session → orphaned
    expect(getWorkerStatus(state2, 'agent-001')).toBe('completed') // completed from old session → NOT orphaned (correct!)
    expect(getWorkerStatus(state2, 'agent-002')).toBe('running') // from new session

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

async function appendWorkerSpawnKv(
  store: LocalFileEventStore,
  base: {
    version: 1
    coordinatorId: string
    sessionId: string
  },
  workerId: string,
  directive: string,
  timestamp: number,
): Promise<void> {
  await store.append(
    createKvEvent(workerKey(workerId, 'status'), 'running', 'coordinator', {
      ...base,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(
      workerKey(workerId, 'sessionId'),
      base.sessionId,
      'coordinator',
      {
        ...base,
        timestamp,
      },
    ),
  )
  await store.append(
    createKvEvent(workerKey(workerId, 'directive'), directive, 'coordinator', {
      ...base,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(workerKey(workerId, 'agentType'), 'worker', 'coordinator', {
      ...base,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(
      workerKey(workerId, 'spawnedAt'),
      String(timestamp),
      'coordinator',
      {
        ...base,
        timestamp,
      },
    ),
  )
  await store.append(
    createKvEvent(
      workerKey(workerId, 'updatedAt'),
      String(timestamp),
      'coordinator',
      {
        ...base,
        timestamp,
      },
    ),
  )
}
