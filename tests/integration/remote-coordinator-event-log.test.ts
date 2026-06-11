import { describe, expect, test } from 'bun:test'
import { RemoteEventStore } from '../../src/coordinator/remoteEventStore.js'
import {
  projectTeamState,
  renderTeamContext,
} from '../../src/coordinator/teamProjection.js'
import type { TeamEvent } from '../../src/coordinator/teamEventStore.js'

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>

type MemoryEventEndpoint = {
  events: TeamEvent[]
  url: string
}

function startMemoryEventEndpoint(url: string): MemoryEventEndpoint {
  return {
    events: [],
    url,
  }
}

function createMemoryFetch(endpoints: MemoryEventEndpoint[]): FetchHandler {
  return async (input, init) => {
    const url = new URL(String(input))
    const endpoint = endpoints.find(candidate => candidate.url === url.origin)
    if (!endpoint || url.pathname !== '/events') {
      return new Response('not found', { status: 404 })
    }

    if (init?.method === 'POST') {
      endpoint.events.push(JSON.parse(String(init.body)) as TeamEvent)
      return new Response('ok')
    }

    const since = url.searchParams.get('since')
    const timestamp = since === null ? undefined : Number(since)
    return Response.json(
      endpoint.events.filter(
        event => timestamp === undefined || event.timestamp > timestamp,
      ),
    )
  }
}

async function withFetchMock<T>(
  fetchMock: FetchHandler,
  run: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch
  globalThis.fetch = fetchMock as typeof fetch
  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}

describe('remote coordinator event log integration', () => {
  test('reads another machine event log and renders projected team context', async () => {
    const machineA = startMemoryEventEndpoint('http://machine-a.test')
    const machineB = startMemoryEventEndpoint('http://machine-b.test')

    await withFetchMock(createMemoryFetch([machineA, machineB]), async () => {
      const machineAStore = new RemoteEventStore(machineA.url)
      const machineBRemoteViewOfA = new RemoteEventStore(machineA.url)

      await machineAStore.append({
        version: 1,
        timestamp: 100,
        coordinatorId: 'machine-a',
        sessionId: 'session-a',
        type: 'coordinator.worker_spawned',
        workerId: 'worker-remote-1',
        directive: 'Investigate remote status',
        agentType: 'worker',
      })
      await machineAStore.append({
        version: 1,
        timestamp: 150,
        coordinatorId: 'machine-a',
        sessionId: 'session-a',
        type: 'coordinator.worker_result',
        workerId: 'worker-remote-1',
        status: 'completed',
        summary: 'Remote worker finished',
      })

      const remoteEvents = await machineBRemoteViewOfA.read()
      const state = projectTeamState(remoteEvents)
      const rendered = renderTeamContext(state)

      expect(machineA.events).toHaveLength(2)
      expect(machineB.events).toHaveLength(0)
      expect(state.workers['worker-remote-1']?.status).toBe('completed')
      expect(rendered).toContain('worker-remote-1')
      expect(rendered).toContain('Remote worker finished')
    })
  })
})
