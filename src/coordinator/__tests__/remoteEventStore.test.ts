import { describe, expect, test } from 'bun:test'
import { RemoteEventStore } from '../remoteEventStore.js'
import type { TeamEvent } from '../teamEventStore.js'

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>

const baseEvent = {
  version: 1,
  timestamp: 1000,
  coordinatorId: 'coordinator-a',
  sessionId: 'session-a',
} as const

describe('RemoteEventStore', () => {
  test('append sends POST to server', async () => {
    const received: TeamEvent[] = []
    const requestedUrls: string[] = []

    await withFetchMock(
      async (input, init) => {
        requestedUrls.push(String(input))
        expect(init?.method).toBe('POST')
        expect(requestedUrls[0]).toBe('http://machine-a.test/events')
        received.push(JSON.parse(String(init?.body)) as TeamEvent)
        return new Response('ok')
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')
        await store.append({
          ...baseEvent,
          type: 'coordinator.worker_spawned',
          workerId: 'worker-1',
          directive: 'Investigate tests',
          agentType: 'worker',
        })

        expect(received).toHaveLength(1)
        expect(received[0]?.type).toBe('coordinator.worker_spawned')
        expect(received[0]).toMatchObject({
          workerId: 'worker-1',
          directive: 'Investigate tests',
        })
      },
    )
  })

  test('read returns server event array', async () => {
    const events: TeamEvent[] = [
      {
        ...baseEvent,
        type: 'coordinator.session_started',
      },
    ]

    await withFetchMock(
      async input => {
        expect(String(input)).toBe('http://machine-a.test/events')
        return Response.json(events)
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')

        expect(await store.read()).toEqual(events)
      },
    )
  })

  test('read sends since query parameter', async () => {
    let receivedSince: string | null = null

    await withFetchMock(
      async input => {
        const url = new URL(String(input))
        receivedSince = url.searchParams.get('since')
        return Response.json([])
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')
        await store.read(1234)

        expect(receivedSince).toBe('1234')
      },
    )
  })

  test('read returns empty array when the server is unavailable', async () => {
    await withFetchMock(
      async () => {
        throw new Error('connection refused')
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')

        expect(await store.read()).toEqual([])
      },
    )
  })

  test('append does not throw when the server is unavailable', async () => {
    await withFetchMock(
      async () => {
        throw new Error('connection refused')
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')

        await expect(
          store.append({
            ...baseEvent,
            type: 'coordinator.session_started',
          }),
        ).resolves.toBeUndefined()
      },
    )
  })

  test('clear sends DELETE to server', async () => {
    const requestedUrls: string[] = []

    await withFetchMock(
      async (input, init) => {
        requestedUrls.push(String(input))
        expect(init?.method).toBe('DELETE')
        return new Response('ok')
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')
        await store.clear()

        expect(requestedUrls).toEqual(['http://machine-a.test/events'])
      },
    )
  })

  test('clear with before sends DELETE with query parameter', async () => {
    let receivedBefore: string | null = null

    await withFetchMock(
      async (input, init) => {
        const url = new URL(String(input))
        receivedBefore = url.searchParams.get('before')
        expect(init?.method).toBe('DELETE')
        return new Response('ok')
      },
      async () => {
        const store = new RemoteEventStore('http://machine-a.test')
        await store.clear(1234)

        expect(receivedBefore).toBe('1234')
      },
    )
  })
})

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
