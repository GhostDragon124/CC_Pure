import { describe, expect, test } from 'bun:test'
import {
  close,
  deleteByPrefix,
  deleteKey,
  get,
  getEvents,
  getByPrefix,
  open,
  rebuildKvFromEvents,
  recordEvent,
  set,
} from '../BlackboardStore.js'

describe('BlackboardStore', () => {
  test('open creates the kv and events schema and set inserts heartbeat entries', () => {
    const db = open(':memory:')

    try {
      set(
        db,
        'worker:alpha:heartbeat',
        '2026-01-01T00:00:00.000Z',
        'worker:alpha',
      )

      const entry = get(db, 'worker:alpha:heartbeat')
      expect(entry).not.toBeNull()
      expect(entry).toMatchObject({
        key: 'worker:alpha:heartbeat',
        value: '2026-01-01T00:00:00.000Z',
        version: 1,
        updatedBy: 'worker:alpha',
      })
      expect(entry?.updatedAt).toBeString()
      expect(
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'events'",
          )
          .get(),
      ).not.toBeNull()
    } finally {
      close(db)
    }
  })

  test('recordEvent appends an event and upserts kv in one write path', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'running',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'done',
        { reason: 'finished' },
      )

      expect(get(db, 'worker:alpha:status')).toMatchObject({
        key: 'worker:alpha:status',
        value: 'done',
        version: 2,
        updatedBy: 'worker:alpha',
      })

      const events = getEvents(db)
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        actor: 'worker:alpha',
        type: 'worker_status',
        key: 'worker:alpha:status',
        value: 'running',
        payload: {},
      })
      expect(events[1]).toMatchObject({
        actor: 'worker:alpha',
        value: 'done',
        payload: { reason: 'finished' },
      })
    } finally {
      close(db)
    }
  })

  test('getEvents filters by timestamp', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'coordinator',
        'worker_status',
        'worker:a:status',
        'running',
      )
      const firstTs = getEvents(db)[0]!.ts
      recordEvent(
        db,
        'coordinator',
        'worker_status',
        'worker:b:status',
        'running',
      )

      expect(getEvents(db, firstTs).map(event => event.key)).toEqual([
        'worker:b:status',
      ])
    } finally {
      close(db)
    }
  })

  test('rebuildKvFromEvents recreates current kv state from event history', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'running',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'completed',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_result',
        'worker:alpha:result',
        'ok',
      )

      deleteByPrefix(db, 'worker:')
      expect(getByPrefix(db, 'worker:')).toEqual([])

      rebuildKvFromEvents(db)

      expect(get(db, 'worker:alpha:status')).toMatchObject({
        value: 'completed',
        version: 2,
        updatedBy: 'worker:alpha',
      })
      expect(get(db, 'worker:alpha:result')).toMatchObject({
        value: 'ok',
        version: 1,
        updatedBy: 'worker:alpha',
      })
    } finally {
      close(db)
    }
  })

  test('rebuildKvFromEvents replays delete tombstones', () => {
    const db = open(':memory:')

    try {
      recordEvent(db, 'test', 'legacy_write', 'unknown:key', 'junk')
      recordEvent(
        db,
        'blackboard-janitor',
        'janitor_action',
        'unknown:key',
        'delete_orphaned_key',
        { delete: true },
      )

      recordEvent(db, 'test', 'legacy_write', 'unknown:key', 'junk-again')
      deleteKey(db, 'unknown:key')

      rebuildKvFromEvents(db)

      expect(get(db, 'unknown:key')).toMatchObject({
        value: 'junk-again',
      })

      recordEvent(
        db,
        'blackboard-janitor',
        'janitor_action',
        'unknown:key',
        'delete_orphaned_key',
        { delete: true },
      )
      rebuildKvFromEvents(db)

      expect(get(db, 'unknown:key')).toBeNull()
    } finally {
      close(db)
    }
  })

  test('get returns null for missing keys', () => {
    const db = open(':memory:')

    try {
      expect(get(db, 'worker:missing:status')).toBeNull()
    } finally {
      close(db)
    }
  })

  test('getByPrefix returns matching entries ordered by key', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:beta',
        'worker_status',
        'worker:beta:status',
        'running',
      )
      recordEvent(db, 'coordinator', 'team_plan', 'team:plan', 'ship it')
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'done',
      )

      expect(getByPrefix(db, 'worker:').map(entry => entry.key)).toEqual([
        'worker:alpha:status',
        'worker:beta:status',
      ])
    } finally {
      close(db)
    }
  })

  test('deleteKey removes one entry', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'running',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_result',
        'worker:alpha:result',
        'ok',
      )

      deleteKey(db, 'worker:alpha:status')

      expect(get(db, 'worker:alpha:status')).toBeNull()
      expect(get(db, 'worker:alpha:result')).not.toBeNull()
    } finally {
      close(db)
    }
  })

  test('deleteByPrefix removes all entries under a prefix', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'running',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_result',
        'worker:alpha:result',
        'ok',
      )
      recordEvent(db, 'coordinator', 'team_plan', 'team:plan', 'ship it')

      deleteByPrefix(db, 'worker:alpha:')

      expect(getByPrefix(db, 'worker:alpha:')).toEqual([])
      expect(get(db, 'team:plan')).not.toBeNull()
    } finally {
      close(db)
    }
  })
})
