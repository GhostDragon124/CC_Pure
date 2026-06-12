import { describe, expect, test } from 'bun:test'
import {
  cleanupOrphanedKeys,
  cleanupStaleWorkers,
  detectDeadWorkers,
  tick,
} from '../BlackboardJanitor.js'
import {
  close,
  get,
  getEvents,
  open,
  recordEvent,
  set,
} from '../BlackboardStore.js'

function insertEntry(
  db: ReturnType<typeof open>,
  key: string,
  value: string,
  updatedAt: string,
): void {
  db.query(
    `
      INSERT INTO kv (key, value, version, updated_at, updated_by)
      VALUES ($key, $value, 1, $updatedAt, 'test')
    `,
  ).run({ $key: key, $value: value, $updatedAt: updatedAt })
}

describe('BlackboardJanitor', () => {
  test('cleanupStaleWorkers marks old active workers as orphaned', () => {
    const db = open(':memory:')

    try {
      insertEntry(db, 'worker:old:status', 'running', '2000-01-01 00:00:00')
      recordEvent(
        db,
        'worker:fresh',
        'worker_status',
        'worker:fresh:status',
        'running',
      )
      insertEntry(db, 'worker:done:status', 'done', '2000-01-01 00:00:00')

      cleanupStaleWorkers(db, 60)

      expect(get(db, 'worker:old:status')).toMatchObject({
        value: 'orphaned',
        version: 2,
        updatedBy: 'blackboard-janitor',
      })
      expect(get(db, 'worker:fresh:status')?.value).toBe('running')
      expect(get(db, 'worker:done:status')?.value).toBe('done')
      expect(getEvents(db).at(-1)).toMatchObject({
        actor: 'blackboard-janitor',
        type: 'janitor_action',
        key: 'worker:old:status',
        value: 'orphaned',
      })
    } finally {
      close(db)
    }
  })

  test('cleanupOrphanedKeys deletes keys outside valid prefixes', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        'worker:alpha:status',
        'running',
      )
      recordEvent(db, 'coordinator', 'team_plan', 'team:plan', 'ship it')
      set(db, 'unknown:key', 'junk', 'test')

      cleanupOrphanedKeys(db, ['worker:', 'team:', 'coordinator:'])

      expect(get(db, 'worker:alpha:status')).not.toBeNull()
      expect(get(db, 'team:plan')).not.toBeNull()
      expect(get(db, 'unknown:key')).toBeNull()
    } finally {
      close(db)
    }
  })

  test('detectDeadWorkers marks active workers with old heartbeats as dead', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:old',
        'worker_status',
        'worker:old:status',
        'running',
      )
      insertEntry(
        db,
        'worker:old:heartbeat',
        '2000-01-01T00:00:00.000Z',
        '2000-01-01 00:00:00',
      )
      recordEvent(
        db,
        'worker:fresh',
        'worker_status',
        'worker:fresh:status',
        'running',
      )
      set(
        db,
        'worker:fresh:heartbeat',
        new Date().toISOString(),
        'worker:fresh',
      )

      detectDeadWorkers(db, 60)

      expect(get(db, 'worker:old:status')).toMatchObject({
        value: 'dead',
        version: 2,
        updatedBy: 'blackboard-janitor',
      })
      expect(get(db, 'worker:fresh:status')?.value).toBe('running')
      expect(getEvents(db).at(-1)).toMatchObject({
        actor: 'blackboard-janitor',
        type: 'janitor_action',
        key: 'worker:old:status',
        value: 'dead',
      })
    } finally {
      close(db)
    }
  })

  test('detectDeadWorkers marks active workers without heartbeat as dead', () => {
    const db = open(':memory:')

    try {
      recordEvent(
        db,
        'worker:missing',
        'worker_status',
        'worker:missing:status',
        'running',
      )

      detectDeadWorkers(db, 60)

      expect(get(db, 'worker:missing:status')).toMatchObject({
        value: 'dead',
        updatedBy: 'blackboard-janitor',
      })
      expect(getEvents(db).at(-1)).toMatchObject({
        actor: 'blackboard-janitor',
        type: 'janitor_action',
        key: 'worker:missing:status',
        value: 'dead',
      })
    } finally {
      close(db)
    }
  })

  test('tick runs stale worker, orphan key, and heartbeat cleanup passes', () => {
    const db = open(':memory:')

    try {
      insertEntry(db, 'worker:stale:status', 'running', '2000-01-01 00:00:00')
      recordEvent(
        db,
        'worker:no-heartbeat',
        'worker_status',
        'worker:no-heartbeat:status',
        'running',
      )
      set(db, 'mystery:key', 'junk', 'test')

      tick(db)

      expect(get(db, 'worker:stale:status')?.value).toBe('orphaned')
      expect(get(db, 'worker:no-heartbeat:status')?.value).toBe('dead')
      expect(get(db, 'mystery:key')).toBeNull()
    } finally {
      close(db)
    }
  })
})
