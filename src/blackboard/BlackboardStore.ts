import { Database } from 'bun:sqlite'
import { dirname } from 'path'
import { mkdirSync } from 'fs'
import type { BlackboardEntry, BlackboardEvent } from './BlackboardTypes.js'

type BlackboardRow = {
  key: string
  value: string
  version: number
  updated_at: string
  updated_by: string
}

type EventRow = {
  id: number
  ts: number
  actor: string
  type: string
  key: string
  value: string
  payload: string
}

let lastEventTimestamp = 0

function mapRow(row: BlackboardRow): BlackboardEntry {
  return {
    key: row.key,
    value: row.value,
    version: row.version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function mapEventRow(row: EventRow): BlackboardEvent {
  return {
    id: row.id,
    ts: row.ts,
    actor: row.actor,
    type: row.type,
    key: row.key,
    value: row.value,
    payload: parsePayload(row.payload),
  }
}

function nextEventTimestamp(): number {
  const now = Date.now()
  lastEventTimestamp = now > lastEventTimestamp ? now : lastEventTimestamp + 1
  return lastEventTimestamp
}

function isDeletePayload(payload: Record<string, unknown>): boolean {
  return payload.delete === true
}

function ensureParentDirectory(path: string): void {
  if (path === ':memory:') return

  const parent = dirname(path)
  if (parent === '.' || parent === '') return

  mkdirSync(parent, { recursive: true })
}

export function open(path: string): Database {
  ensureParentDirectory(path)

  const db = new Database(path)
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      actor TEXT NOT NULL,
      type TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}'
    );
  `)
  migrateLegacyBlackboardTable(db)
  return db
}

function migrateLegacyBlackboardTable(db: Database): void {
  const legacy = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blackboard'",
    )
    .get()
  if (!legacy) return

  db.exec(`
    INSERT OR IGNORE INTO kv (key, value, version, updated_at, updated_by)
    SELECT key, value, version, updated_at, updated_by
    FROM blackboard;
  `)
}

function upsertKv(
  db: Database,
  key: string,
  value: string,
  writer: string,
): void {
  db.query(
    `
      INSERT INTO kv (key, value, version, updated_at, updated_by)
      VALUES ($key, $value, 1, datetime('now'), $writer)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        version = kv.version + 1,
        updated_at = datetime('now'),
        updated_by = excluded.updated_by
    `,
  ).run({ $key: key, $value: value, $writer: writer })
}

function replayKvEvent(
  db: Database,
  key: string,
  value: string,
  writer: string,
  ts: number,
): void {
  db.query(
    `
      INSERT INTO kv (key, value, version, updated_at, updated_by)
      VALUES ($key, $value, 1, datetime($ts / 1000, 'unixepoch'), $writer)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        version = kv.version + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
  ).run({ $key: key, $value: value, $writer: writer, $ts: ts })
}

// Direct kv writes are reserved for heartbeat-style state that should not
// produce audit events. Durable state changes should use recordEvent().
export function set(
  db: Database,
  key: string,
  value: string,
  writer: string,
): void {
  upsertKv(db, key, value, writer)
}

export function recordEvent(
  db: Database,
  actor: string,
  type: string,
  key: string,
  value: string,
  payload: Record<string, unknown> = {},
): void {
  const ts = nextEventTimestamp()
  const payloadJson = JSON.stringify(payload)
  const write = db.transaction(() => {
    db.query(
      `
        INSERT INTO events (ts, actor, type, key, value, payload)
        VALUES ($ts, $actor, $type, $key, $value, $payload)
      `,
    ).run({
      $ts: ts,
      $actor: actor,
      $type: type,
      $key: key,
      $value: value,
      $payload: payloadJson,
    })

    if (isDeletePayload(payload)) {
      deleteKey(db, key)
    } else {
      upsertKv(db, key, value, actor)
    }
  })
  write()
}

export function get(db: Database, key: string): BlackboardEntry | null {
  const row = db
    .query<BlackboardRow, { $key: string }>(
      `
        SELECT key, value, version, updated_at, updated_by
        FROM kv
        WHERE key = $key
      `,
    )
    .get({ $key: key })

  return row ? mapRow(row) : null
}

export function getByPrefix(db: Database, prefix: string): BlackboardEntry[] {
  return db
    .query<BlackboardRow, { $prefix: string }>(
      `
        SELECT key, value, version, updated_at, updated_by
        FROM kv
        WHERE key LIKE $prefix || '%'
        ORDER BY key ASC
      `,
    )
    .all({ $prefix: prefix })
    .map(mapRow)
}

export function deleteKey(db: Database, key: string): void {
  db.query('DELETE FROM kv WHERE key = $key').run({ $key: key })
}

export { deleteKey as delete }

export function deleteByPrefix(db: Database, prefix: string): void {
  db.query("DELETE FROM kv WHERE key LIKE $prefix || '%'").run({
    $prefix: prefix,
  })
}

export function getEvents(db: Database, since?: number): BlackboardEvent[] {
  const rows =
    since === undefined
      ? db
          .query<EventRow, []>(
            `
              SELECT id, ts, actor, type, key, value, payload
              FROM events
              ORDER BY id ASC
            `,
          )
          .all()
      : db
          .query<EventRow, { $since: number }>(
            `
              SELECT id, ts, actor, type, key, value, payload
              FROM events
              WHERE ts > $since
              ORDER BY id ASC
            `,
          )
          .all({ $since: since })

  return rows.map(mapEventRow)
}

export function rebuildKvFromEvents(db: Database): void {
  const rows = db
    .query<EventRow, []>(
      `
        SELECT id, ts, actor, type, key, value, payload
        FROM events
        ORDER BY id ASC
      `,
    )
    .all()

  const rebuild = db.transaction(() => {
    db.query('DELETE FROM kv').run()
    for (const row of rows) {
      if (isDeletePayload(parsePayload(row.payload))) {
        deleteKey(db, row.key)
      } else {
        replayKvEvent(db, row.key, row.value, row.actor, row.ts)
      }
    }
  })
  rebuild()
}

export function close(db: Database): void {
  db.close()
}
