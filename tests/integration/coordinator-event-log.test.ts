import { beforeAll, describe, expect, mock, test } from 'bun:test'
import { buildPostCompactMessages } from '../../src/services/compact/compact.js'
import {
  createSystemMessage,
  createUserMessage,
} from '../../src/utils/messages.js'
import { setEventStore } from '../../src/coordinator/eventStoreInstance.js'
import {
  projectTeamState,
  renderTeamContext,
} from '../../src/coordinator/teamProjection.js'
import type { CompactionResult } from '../../src/services/compact/compact.js'
import {
  createKvEvent,
  EventStore,
  TeamEvent,
} from '../../src/coordinator/teamEventStore.js'
import { getWorkerStatus, workerKey } from '../../src/coordinator/kvHelpers.js'

mock.module('bun:bundle', () => ({
  feature: (name: string) => name === 'COORDINATOR_MODE',
}))

class MockEventStore implements EventStore {
  events: TeamEvent[] = []

  async append(event: TeamEvent): Promise<void> {
    this.events.push(event)
  }

  async read(since?: number): Promise<TeamEvent[]> {
    return this.events.filter(
      event => since === undefined || event.timestamp > since,
    )
  }

  async clear(before?: number): Promise<void> {
    if (before === undefined) {
      this.events = []
      return
    }

    this.events = this.events.filter(event => event.timestamp >= before)
  }
}

let clearEventsBeforeCheckpoint: (
  teamContext: string | undefined,
) => Promise<void>

beforeAll(async () => {
  const queryModule = await import('../../src/query.js')
  clearEventsBeforeCheckpoint = queryModule.clearEventsBeforeCheckpoint
})

describe('coordinator event log integration', () => {
  test('recovers team state from events after compaction', async () => {
    const store = new MockEventStore()
    setEventStore(store)

    const baseEvent = {
      version: 1,
      coordinatorId: 'coordinator-a',
      sessionId: 'session-a',
    } as const
    await appendWorkerSpawnKv(
      store,
      baseEvent,
      'worker-1',
      'Investigate tests',
      100,
    )
    await appendWorkerSpawnKv(
      store,
      baseEvent,
      'worker-2',
      'Inspect implementation',
      110,
    )
    await store.append(
      createKvEvent(workerKey('worker-1', 'status'), 'completed', 'worker-1', {
        ...baseEvent,
        timestamp: 150,
      }),
    )
    await store.append(
      createKvEvent(
        workerKey('worker-1', 'summary'),
        'Tests are green',
        'worker-1',
        {
          ...baseEvent,
          timestamp: 150,
        },
      ),
    )
    await store.append(
      createKvEvent(workerKey('worker-1', 'updatedAt'), '150', 'worker-1', {
        ...baseEvent,
        timestamp: 150,
      }),
    )

    const recovered = projectTeamState(await store.read())
    const teamContext = renderTeamContext(recovered)
    const compacted = buildPostCompactMessages(
      makeCompactionResult(),
      teamContext,
    )

    expect(getWorkerStatus(recovered, 'worker-1')).toBe('completed')
    expect(getWorkerStatus(recovered, 'worker-2')).toBe('running')
    expect(compacted.at(-1)?.type).toBe('system')
    expect(compacted.at(-1)?.content).toContain('worker-1')
    expect(compacted.at(-1)?.content).toContain('worker-2')
  })

  test('writes checkpoint and clears events before it after compaction', async () => {
    const store = new MockEventStore()
    setEventStore(store)
    process.env.COORDINATOR_ID = 'coordinator-test'

    const originalDateNow = Date.now
    Date.now = () => 200

    try {
      const baseEvent = {
        version: 1,
        coordinatorId: 'coordinator-test',
        sessionId: 'session-a',
      } as const
      await appendWorkerSpawnKv(
        store,
        baseEvent,
        'worker-1',
        'Investigate checkpoint cleanup',
        100,
      )
      await store.append(
        createKvEvent(
          workerKey('worker-1', 'status'),
          'completed',
          'worker-1',
          {
            ...baseEvent,
            timestamp: 150,
          },
        ),
      )
      await store.append(
        createKvEvent(
          workerKey('worker-1', 'summary'),
          'Checkpoint cleanup is ready',
          'worker-1',
          {
            ...baseEvent,
            timestamp: 150,
          },
        ),
      )
      await store.append(
        createKvEvent(workerKey('worker-1', 'updatedAt'), '150', 'worker-1', {
          ...baseEvent,
          timestamp: 150,
        }),
      )

      await clearEventsBeforeCheckpoint('<coordinator-team-state />')

      expect(store.events.every(event => event.type === 'coordinator.kv')).toBe(
        true,
      )
      expect(store.events.every(event => event.timestamp === 200)).toBe(true)
      expect(
        store.events.every(event => event.coordinatorId === 'coordinator-test'),
      ).toBe(true)
      expect(
        projectTeamState(store.events)[workerKey('worker-1', 'status')]?.value,
      ).toBe('completed')
    } finally {
      Date.now = originalDateNow
      delete process.env.COORDINATOR_ID
    }
  })
})

function makeCompactionResult(): CompactionResult {
  return {
    boundaryMarker: createSystemMessage('compact boundary', 'info'),
    summaryMessages: [createUserMessage({ content: 'summary', isMeta: true })],
    attachments: [],
    hookResults: [],
    messagesToKeep: [],
  }
}

async function appendWorkerSpawnKv(
  store: EventStore,
  baseEvent: {
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
      ...baseEvent,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(
      workerKey(workerId, 'sessionId'),
      baseEvent.sessionId,
      'coordinator',
      {
        ...baseEvent,
        timestamp,
      },
    ),
  )
  await store.append(
    createKvEvent(workerKey(workerId, 'directive'), directive, 'coordinator', {
      ...baseEvent,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(workerKey(workerId, 'agentType'), 'worker', 'coordinator', {
      ...baseEvent,
      timestamp,
    }),
  )
  await store.append(
    createKvEvent(
      workerKey(workerId, 'spawnedAt'),
      String(timestamp),
      'coordinator',
      {
        ...baseEvent,
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
        ...baseEvent,
        timestamp,
      },
    ),
  )
}
