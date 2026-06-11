import type { Server } from 'bun'
import { logForDebugging } from 'src/utils/debug.js'
import { LocalFileEventStore, type TeamEvent } from './teamEventStore.js'

const DEFAULT_PORT = 9742

export function startEventServer(port = configuredPort()): Server<unknown> {
  const store = new LocalFileEventStore()

  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname !== '/events') {
        return new Response('not found', { status: 404 })
      }

      if (req.method === 'GET') {
        const since = parseSince(url.searchParams.get('since'))
        return Response.json(await store.read(since))
      }

      if (req.method === 'DELETE') {
        const before = parseSince(url.searchParams.get('before'))
        await store.clear(before)
        return new Response('ok')
      }

      if (req.method === 'POST') {
        try {
          const event = JSON.parse(await req.text()) as TeamEvent
          await store.append(event)
          return new Response('ok')
        } catch (error) {
          logForDebugging(
            'Failed to append coordinator team event from HTTP request: ' +
              String(error),
          )
          return new Response('invalid event', { status: 400 })
        }
      }

      return new Response('method not allowed', { status: 405 })
    },
  })
}

export function stopEventServer(server: Server<unknown>): void {
  server.stop()
}

function configuredPort(): number {
  const configured = process.env.TEAM_EVENT_SERVER_PORT
  if (!configured) {
    return DEFAULT_PORT
  }

  const port = Number(configured)
  return Number.isFinite(port) ? port : DEFAULT_PORT
}

function parseSince(value: string | null): number | undefined {
  if (value === null) {
    return undefined
  }

  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}
