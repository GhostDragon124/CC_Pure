import type { Database } from 'bun:sqlite'
import {
  BLACKBOARD_NAMESPACES,
  BLACKBOARD_WORKER_NAMESPACE,
} from './BlackboardTypes.js'
import { get } from './BlackboardStore.js'
import { recordJanitorAction } from './eventRecorder.js'
import { workerKey } from './kvHelpers.js'

const DEFAULT_STALE_WORKER_SECONDS = 60 * 60
const DEFAULT_HEARTBEAT_SECONDS = 5 * 60
const ACTIVE_WORKER_STATUSES = new Set(['running', 'spawned', 'waiting'])

type KeyRow = {
  key: string
}

type WorkerStatusRow = {
  key: string
  value: string
  updated_at: string
}

function isOlderThan(timestamp: string, maxAgeSeconds: number): boolean {
  const time = Date.parse(timestamp)
  if (Number.isNaN(time)) return false

  return Date.now() - time > maxAgeSeconds * 1000
}

function getWorkerIdFromStatusKey(key: string): string | null {
  if (!key.startsWith(BLACKBOARD_WORKER_NAMESPACE)) return null
  if (!key.endsWith(':status')) return null

  return key.slice(
    BLACKBOARD_WORKER_NAMESPACE.length,
    key.length - ':status'.length,
  )
}

function getWorkerStatusRows(db: Database): WorkerStatusRow[] {
  return db
    .query<WorkerStatusRow, []>(
      `
        SELECT key, value, updated_at
        FROM kv
        WHERE key LIKE 'worker:%:status'
        ORDER BY key ASC
      `,
    )
    .all()
}

export function cleanupStaleWorkers(db: Database, maxAgeSeconds: number): void {
  for (const row of getWorkerStatusRows(db)) {
    if (!ACTIVE_WORKER_STATUSES.has(row.value)) continue
    if (!isOlderThan(row.updated_at, maxAgeSeconds)) continue

    void recordJanitorAction(
      db,
      'orphaned',
      row.key,
      'active worker status exceeded stale threshold',
    ).catch(() => {})
  }
}

export function cleanupOrphanedKeys(
  db: Database,
  validPrefixes: readonly string[],
): void {
  const rows = db.query<KeyRow, []>('SELECT key FROM kv ORDER BY key ASC').all()

  for (const row of rows) {
    if (validPrefixes.some(prefix => row.key.startsWith(prefix))) continue
    void recordJanitorAction(
      db,
      'delete_orphaned_key',
      row.key,
      'key was outside valid blackboard prefixes',
    ).catch(() => {})
  }
}

export function detectDeadWorkers(
  db: Database,
  heartbeatThreshold: number,
): void {
  for (const row of getWorkerStatusRows(db)) {
    if (!ACTIVE_WORKER_STATUSES.has(row.value)) continue

    const workerId = getWorkerIdFromStatusKey(row.key)
    if (!workerId) continue

    const heartbeat = get(db, workerKey(workerId, 'heartbeat'))
    if (!heartbeat) {
      void recordJanitorAction(
        db,
        'dead',
        row.key,
        'active worker has no heartbeat',
      ).catch(() => {})
      continue
    }

    const heartbeatTimestamp = Number.isNaN(Date.parse(heartbeat.value))
      ? heartbeat.updatedAt
      : heartbeat.value
    if (isOlderThan(heartbeatTimestamp, heartbeatThreshold)) {
      void recordJanitorAction(
        db,
        'dead',
        row.key,
        'active worker heartbeat exceeded threshold',
      ).catch(() => {})
    }
  }
}

export function tick(db: Database): void {
  cleanupStaleWorkers(db, DEFAULT_STALE_WORKER_SECONDS)
  cleanupOrphanedKeys(db, BLACKBOARD_NAMESPACES)
  detectDeadWorkers(db, DEFAULT_HEARTBEAT_SECONDS)
}
