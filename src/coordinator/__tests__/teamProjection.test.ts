import { describe, expect, test } from 'bun:test'
import { createKvEvent, type TeamEvent } from '../teamEventStore.js'
import {
  applyEvent,
  initialTeamState,
  projectTeamState,
  renderTeamContext,
  type TeamState,
} from '../teamProjection.js'
import { getWorkerDirective, getWorkerStatus, workerKey } from '../kvHelpers.js'

const baseEvent = {
  version: 1,
  timestamp: 1000,
  coordinatorId: 'coordinator-a',
  sessionId: 'session-a',
} as const

describe('teamProjection', () => {
  test('kv events project to last-write-wins state by structured key', () => {
    const events: TeamEvent[] = [
      createKvEvent('worker:worker-1:status', 'running', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent(
        'worker:worker-1:directive',
        'Inspect auth flow',
        'coordinator',
        {
          ...baseEvent,
        },
      ),
      createKvEvent('worker:worker-1:status', 'completed', 'worker-alpha', {
        ...baseEvent,
        timestamp: 1200,
      }),
      createKvEvent(
        'worker:worker-1:summary',
        'Auth flow is fixed',
        'worker-alpha',
        {
          ...baseEvent,
          timestamp: 1200,
        },
      ),
    ]

    const state = projectTeamState(events)

    expect(state[workerKey('worker-1', 'status')]).toEqual({
      value: 'completed',
      writer: 'worker-alpha',
      timestamp: 1200,
    })
    expect(getWorkerStatus(state, 'worker-1')).toBe('completed')
    expect(getWorkerDirective(state, 'worker-1')).toBe('Inspect auth flow')
  })

  test('worker kv key helper builds worker structured keys', () => {
    expect(workerKey('worker-2', 'summary')).toBe('worker:worker-2:summary')
  })

  test('spawn + fail legacy events still mark worker failed with summary', () => {
    const state = projectTeamState([
      {
        ...baseEvent,
        type: 'coordinator.worker_spawned',
        workerId: 'worker-2',
        directive: 'Run tests',
        agentType: 'worker',
      },
      {
        ...baseEvent,
        timestamp: 1400,
        type: 'coordinator.worker_result',
        workerId: 'worker-2',
        status: 'failed',
        summary: 'Tests failed',
      },
    ])

    expect(getWorkerStatus(state, 'worker-2')).toBe('failed')
    expect(state[workerKey('worker-2', 'summary')]?.value).toBe('Tests failed')
  })

  test('session_started from a new session marks old running workers orphaned', () => {
    const state = projectTeamState([
      {
        ...baseEvent,
        type: 'coordinator.worker_spawned',
        workerId: 'worker-3',
        directive: 'Long running task',
        agentType: 'worker',
      },
      {
        ...baseEvent,
        timestamp: 2000,
        sessionId: 'session-b',
        type: 'coordinator.session_started',
      },
    ])

    expect(getWorkerStatus(state, 'worker-3')).toBe('orphaned')
  })

  test('projectTeamState identity returns the initial state', () => {
    expect(projectTeamState([])).toEqual(initialTeamState())
  })

  test('renderer includes worker ids, statuses, timestamps, and synthesis', () => {
    const state = projectTeamState([
      createKvEvent('worker:worker-4:status', 'running', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent('worker:worker-4:sessionId', 'session-a', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent(
        'worker:worker-4:directive',
        'Summarize package layout',
        'coordinator',
        {
          ...baseEvent,
        },
      ),
      createKvEvent('worker:worker-4:agentType', 'worker', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent('worker:worker-4:spawnedAt', '1000', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent('worker:worker-4:updatedAt', '1000', 'coordinator', {
        ...baseEvent,
      }),
      createKvEvent(
        'team:synthesis:findings',
        'Package layout is stable',
        'coordinator',
        {
          ...baseEvent,
          timestamp: 1600,
        },
      ),
      createKvEvent(
        'team:synthesis:decisions',
        'Continue implementation',
        'coordinator',
        {
          ...baseEvent,
          timestamp: 1600,
        },
      ),
      createKvEvent('team:synthesis:timestamp', '1600', 'coordinator', {
        ...baseEvent,
        timestamp: 1600,
      }),
    ])

    const rendered = renderTeamContext(state)

    expect(rendered).toContain('<coordinator-team-state>')
    expect(rendered).toContain('worker-4')
    expect(rendered).toContain('running')
    expect(rendered).toContain('1000')
    expect(rendered).toContain('Package layout is stable')
  })

  test('checkpoint restores full projected state', () => {
    const projectedState: TeamState = {
      'worker:restored:status': {
        value: 'completed',
        writer: 'coordinator',
        timestamp: 3200,
      },
      'worker:restored:sessionId': {
        value: 'session-z',
        writer: 'coordinator',
        timestamp: 3000,
      },
      'worker:restored:directive': {
        value: 'Restored directive',
        writer: 'coordinator',
        timestamp: 3000,
      },
      'worker:restored:agentType': {
        value: 'worker',
        writer: 'coordinator',
        timestamp: 3000,
      },
      'worker:restored:spawnedAt': {
        value: '3000',
        writer: 'coordinator',
        timestamp: 3000,
      },
      'worker:restored:updatedAt': {
        value: '3200',
        writer: 'coordinator',
        timestamp: 3200,
      },
      'worker:restored:summary': {
        value: 'Done',
        writer: 'coordinator',
        timestamp: 3200,
      },
      'team:synthesis:findings': {
        value: 'Restored findings',
        writer: 'coordinator',
        timestamp: 3300,
      },
      'team:synthesis:decisions': {
        value: 'Restored decisions',
        writer: 'coordinator',
        timestamp: 3300,
      },
      'team:synthesis:timestamp': {
        value: '3300',
        writer: 'coordinator',
        timestamp: 3300,
      },
    }

    const state = applyEvent(
      projectTeamState([
        {
          ...baseEvent,
          type: 'coordinator.worker_spawned',
          workerId: 'stale',
          directive: 'Stale worker',
          agentType: 'worker',
        },
      ]),
      {
        ...baseEvent,
        timestamp: 3400,
        type: 'coordinator.checkpoint',
        projectedState,
      },
    )

    expect(state).toEqual(projectedState)
  })
})
