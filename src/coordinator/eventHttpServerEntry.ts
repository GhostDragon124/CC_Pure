/**
 * @deprecated JSONL team event serving is superseded by SQLite blackboard
 * events. This entrypoint is retained for legacy compatibility only.
 *
 * Entrypoint for the coordinator team event HTTP server.
 * Run: TEAM_EVENT_SERVER_PORT=9742 bun run src/coordinator/eventHttpServerEntry.ts
 */
import { startEventServer } from './eventHttpServer.js'

const port = Number(process.env.TEAM_EVENT_SERVER_PORT) || 9742
console.log(`[event-server] starting on http://0.0.0.0:${port}`)
const server = startEventServer(port)
console.log(`[event-server] listening on port ${server.port}`)
