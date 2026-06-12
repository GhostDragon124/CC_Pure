/**
 * Blackboard production smoke test.
 * Runs the full write path through recordEvent() → kv + events in one transaction.
 * Simulates 3 workers through complete lifecycle, then verifies audit trail.
 */
import {
  open,
  get,
  getByPrefix,
  getEvents,
  recordEvent,
  rebuildKvFromEvents,
  close,
} from '../BlackboardStore.js'
import { tick } from '../BlackboardJanitor.js'
import { describe, expect, test } from 'bun:test'
import {
  workerKey,
  teamKey,
  coordinatorKey,
  getWorkerStatus,
  getWorkerField,
} from '../kvHelpers.js'

describe('Blackboard Production Smoke Test', () => {
  test('full lifecycle: recordEvent → kv consistency → events audit → rebuild', () => {
    const db = open(':memory:')

    try {
      // === Phase 1: Record coordinator session start ===
      recordEvent(
        db,
        'coordinator',
        'coordinator_session_started',
        coordinatorKey('session_started'),
        'session-smoke-1',
      )

      // === Phase 2: Spawn 3 workers via recordEvent ===
      const workers = [
        { id: 'alpha', task: 'Analyze CSV', type: 'worker' },
        { id: 'beta', task: 'Build React component', type: 'worker' },
        { id: 'gamma', task: 'Run DB migration', type: 'worker' },
      ]

      for (const w of workers) {
        recordEvent(
          db,
          'coordinator',
          'worker_spawn',
          workerKey(w.id, 'status'),
          'spawned',
          { task: w.task, agentType: w.type },
        )
        recordEvent(
          db,
          'coordinator',
          'worker_spawn',
          workerKey(w.id, 'directive'),
          w.task,
        )
        recordEvent(
          db,
          'coordinator',
          'worker_spawn',
          workerKey(w.id, 'agent_type'),
          w.type,
        )
      }

      // Verify kv state
      expect(get(db, workerKey('alpha', 'status'))?.value).toBe('spawned')
      expect(get(db, workerKey('beta', 'directive'))?.value).toBe(
        'Build React component',
      )

      // === Phase 3: Workers report progress through recordEvent ===
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        workerKey('alpha', 'status'),
        'running',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_status',
        workerKey('alpha', 'status'),
        'done',
      )
      recordEvent(
        db,
        'worker:alpha',
        'worker_result',
        workerKey('alpha', 'result'),
        'CSV parsed: 1500 rows, 12 columns',
      )

      recordEvent(
        db,
        'worker:beta',
        'worker_status',
        workerKey('beta', 'status'),
        'running',
      )
      recordEvent(
        db,
        'worker:beta',
        'worker_status',
        workerKey('beta', 'status'),
        'done',
      )
      recordEvent(
        db,
        'worker:beta',
        'worker_result',
        workerKey('beta', 'result'),
        'Built Dashboard.tsx',
      )

      recordEvent(
        db,
        'worker:gamma',
        'worker_status',
        workerKey('gamma', 'status'),
        'running',
      )
      recordEvent(
        db,
        'worker:gamma',
        'worker_status',
        workerKey('gamma', 'status'),
        'failed',
      )
      recordEvent(
        db,
        'worker:gamma',
        'worker_result',
        workerKey('gamma', 'result'),
        'Migration FK violation',
      )

      // Verify final kv state
      expect(get(db, workerKey('alpha', 'status'))?.value).toBe('done')
      expect(get(db, workerKey('alpha', 'status'))?.version).toBe(3) // spawned→running→done
      expect(get(db, workerKey('gamma', 'status'))?.value).toBe('failed')

      // === Phase 4: Coordinator reads team state (post-compaction rehydration) ===
      const entries = getByPrefix(db, 'worker:')
      const statuses = entries.filter(e => e.key.endsWith(':status'))
      expect(statuses.length).toBe(3)

      const anomalies = statuses.filter(e => e.value === 'failed')
      expect(anomalies.length).toBe(1)

      // === Phase 5: Verify events audit trail ===
      const allEvents = getEvents(db)
      expect(allEvents.length).toBeGreaterThanOrEqual(13) // 1 session + 9 spawn + 7 status + 3 results

      // Events should be ordered by id (chronological)
      for (let i = 1; i < allEvents.length; i++) {
        expect(allEvents[i].id).toBeGreaterThan(allEvents[i - 1].id)
      }

      // === Phase 6: Verify kv-events consistency ===
      // Every non-heartbeat kv entry should have a corresponding event
      const kvEntries = getByPrefix(db, 'worker:')
      for (const kv of kvEntries) {
        const matchingEvents = allEvents.filter(e => e.key === kv.key)
        expect(matchingEvents.length).toBeGreaterThan(0)
        // Last event value should match kv value
        const lastEvent = matchingEvents[matchingEvents.length - 1]
        expect(lastEvent.value).toBe(kv.value)
      }

      // === Phase 7: Rebuild kv from events ===
      // Corrupt kv by deleting everything
      db.exec('DELETE FROM kv')
      expect(getByPrefix(db, 'worker:').length).toBe(0)

      // Rebuild
      rebuildKvFromEvents(db)

      // Verify recovered state
      expect(get(db, workerKey('alpha', 'status'))?.value).toBe('done')
      expect(get(db, workerKey('beta', 'result'))?.value).toBe(
        'Built Dashboard.tsx',
      )
      expect(get(db, workerKey('gamma', 'status'))?.value).toBe('failed')

      // === Phase 8: Janitor with events ===
      const beforeEventCount = getEvents(db).length

      // Inject stale worker via direct set (heartbeat-style)
      db.query(`
        INSERT INTO kv (key, value, version, updated_at, updated_by)
        VALUES ('worker:stale:status', 'running', 1, '2000-01-01 00:00:00', 'test')
      `).run()

      tick(db)
      expect(get(db, 'worker:stale:status')?.value).toBe('orphaned')
    } finally {
      close(db)
    }
  })
})
