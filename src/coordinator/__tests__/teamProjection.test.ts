import { describe, expect, test } from 'bun:test'
import type { TeamEvent } from '../teamEventStore.js'
import {
  applyEvent,
  initialTeamState,
  projectTeamState,
  renderTeamContext,
  type TeamState,
} from '../teamProjection.js'

const baseEvent = {
  version: 1,
  timestamp: 1000,
  coordinatorId: 'coordinator-a',
  sessionId: 'session-a',
} as const

describe('teamProjection', () => {
  test('spawn + complete marks worker completed with summary', () => {
    const events: TeamEvent[] = [
      {
        ...baseEvent,
        type: 'coordinator.worker_spawned',
        workerId: 'worker-1',
        directive: 'Inspect auth flow',
        agentType: 'worker',
      },
      {
        ...baseEvent,
        timestamp: 1200,
        type: 'coordinator.worker_result',
        workerId: 'worker-1',
        status: 'completed',
        summary: 'Auth flow is fixed',
      },
    ]

    const state = projectTeamState(events)

    expect(state.workers['worker-1']).toMatchObject({
      id: 'worker-1',
      status: 'completed',
      directive: 'Inspect auth flow',
      summary: 'Auth flow is fixed',
    })
  })

  test('spawn + fail marks worker failed with summary', () => {
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

    expect(state.workers['worker-2']?.status).toBe('failed')
    expect(state.workers['worker-2']?.summary).toBe('Tests failed')
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

    expect(state.workers['worker-3']?.status).toBe('orphaned')
  })

  test('projectTeamState identity returns the initial state', () => {
    expect(projectTeamState([])).toEqual(initialTeamState())
  })

  test('renderer includes worker ids, statuses, timestamps, and synthesis', () => {
    const state = projectTeamState([
      {
        ...baseEvent,
        type: 'coordinator.worker_spawned',
        workerId: 'worker-4',
        directive: 'Summarize package layout',
        agentType: 'worker',
      },
      {
        ...baseEvent,
        timestamp: 1600,
        type: 'coordinator.synthesis',
        findings: 'Package layout is stable',
        decisions: 'Continue implementation',
      },
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
      workers: {
        restored: {
          id: 'restored',
          status: 'completed',
          sessionId: 'session-z',
          directive: 'Restored directive',
          agentType: 'worker',
          spawnedAt: 3000,
          updatedAt: 3200,
          summary: 'Done',
        },
      },
      lastSynthesis: {
        findings: 'Restored findings',
        decisions: 'Restored decisions',
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
