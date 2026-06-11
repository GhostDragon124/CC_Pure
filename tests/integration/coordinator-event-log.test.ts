import { describe, expect, test } from 'bun:test'
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
import type {
  EventStore,
  TeamEvent,
} from '../../src/coordinator/teamEventStore.js'

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

describe('coordinator event log integration', () => {
  test('recovers team state from events after compaction', async () => {
    const store = new MockEventStore()
    setEventStore(store)

    await store.append({
      version: 1,
      timestamp: 100,
      coordinatorId: 'coordinator-a',
      sessionId: 'session-a',
      type: 'coordinator.worker_spawned',
      workerId: 'worker-1',
      directive: 'Investigate tests',
      agentType: 'worker',
    })
    await store.append({
      version: 1,
      timestamp: 110,
      coordinatorId: 'coordinator-a',
      sessionId: 'session-a',
      type: 'coordinator.worker_spawned',
      workerId: 'worker-2',
      directive: 'Inspect implementation',
      agentType: 'worker',
    })
    await store.append({
      version: 1,
      timestamp: 150,
      coordinatorId: 'coordinator-a',
      sessionId: 'session-a',
      type: 'coordinator.worker_result',
      workerId: 'worker-1',
      status: 'completed',
      summary: 'Tests are green',
    })

    const recovered = projectTeamState(await store.read())
    const teamContext = renderTeamContext(recovered)
    const compacted = buildPostCompactMessages(
      makeCompactionResult(),
      teamContext,
    )

    expect(recovered.workers['worker-1']?.status).toBe('completed')
    expect(recovered.workers['worker-2']?.status).toBe('running')
    expect(compacted.at(-1)?.type).toBe('system')
    expect(compacted.at(-1)?.content).toContain('worker-1')
    expect(compacted.at(-1)?.content).toContain('worker-2')
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
