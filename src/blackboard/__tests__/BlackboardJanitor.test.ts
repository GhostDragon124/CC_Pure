import { describe, expect, test } from 'bun:test'
import {
  cleanupOrphanedKeys,
  cleanupStaleWorkers,
  detectDeadWorkers,
  tick,
} from '../BlackboardJanitor.js'
import { close, get, open, set } from '../BlackboardStore.js'

function insertEntry(
  db: ReturnType<typeof open>,
  key: string,
  value: string,
  updatedAt: string,
): void {
  db.query(
    `
      INSERT INTO blackboard (key, value, version, updated_at, updated_by)
      VALUES ($key, $value, 1, $updatedAt, 'test')
    `,
  ).run({ $key: key, $value: value, $updatedAt: updatedAt })
}

describe('BlackboardJanitor', () => {
  test('cleanupStaleWorkers marks old active workers as orphaned', () => {
    const db = open(':memory:')

    try {
      insertEntry(db, 'worker:old:status', 'running', '2000-01-01 00:00:00')
      set(db, 'worker:fresh:status', 'running', 'worker:fresh')
      insertEntry(db, 'worker:done:status', 'done', '2000-01-01 00:00:00')

      cleanupStaleWorkers(db, 60)

      expect(get(db, 'worker:old:status')).toMatchObject({
        value: 'orphaned',
        version: 2,
        updatedBy: 'blackboard-janitor',
      })
      expect(get(db, 'worker:fresh:status')?.value).toBe('running')
      expect(get(db, 'worker:done:status')?.value).toBe('done')
    } finally {
      close(db)
    }
  })

  test('cleanupOrphanedKeys deletes keys outside valid prefixes', () => {
    const db = open(':memory:')

    try {
      set(db, 'worker:alpha:status', 'running', 'worker:alpha')
      set(db, 'team:plan', 'ship it', 'coordinator')
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
      set(db, 'worker:old:status', 'running', 'worker:old')
      insertEntry(
        db,
        'worker:old:heartbeat',
        '2000-01-01T00:00:00.000Z',
        '2000-01-01 00:00:00',
      )
      set(db, 'worker:fresh:status', 'running', 'worker:fresh')
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
    } finally {
      close(db)
    }
  })

  test('detectDeadWorkers marks active workers without heartbeat as dead', () => {
    const db = open(':memory:')

    try {
      set(db, 'worker:missing:status', 'running', 'worker:missing')

      detectDeadWorkers(db, 60)

      expect(get(db, 'worker:missing:status')).toMatchObject({
        value: 'dead',
        updatedBy: 'blackboard-janitor',
      })
    } finally {
      close(db)
    }
  })

  test('tick runs stale worker, orphan key, and heartbeat cleanup passes', () => {
    const db = open(':memory:')

    try {
      insertEntry(db, 'worker:stale:status', 'running', '2000-01-01 00:00:00')
      set(db, 'worker:no-heartbeat:status', 'running', 'worker:no-heartbeat')
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
