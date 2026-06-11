import type { TeamEvent } from './teamEventStore.js'

export type WorkerStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
  | 'orphaned'

export type TeamWorker = {
  id: string
  status: WorkerStatus
  sessionId: string
  directive: string
  agentType: string
  spawnedAt: number
  updatedAt: number
  summary?: string
}

export type TeamState = {
  workers: Record<string, TeamWorker>
  lastSynthesis?: {
    findings: string
    decisions: string
    timestamp: number
  }
}

export function initialTeamState(): TeamState {
  return { workers: {} }
}

export function applyEvent(state: TeamState, event: TeamEvent): TeamState {
  if (event.version > 1) {
    return state
  }

  switch (event.type) {
    case 'coordinator.session_started': {
      const workers: Record<string, TeamWorker> = {}
      for (const [workerId, worker] of Object.entries(state.workers)) {
        workers[workerId] =
          worker.status === 'running' && worker.sessionId !== event.sessionId
            ? { ...worker, status: 'orphaned', updatedAt: event.timestamp }
            : worker
      }
      return { ...state, workers }
    }
    case 'coordinator.worker_spawned':
      return {
        ...state,
        workers: {
          ...state.workers,
          [event.workerId]: {
            id: event.workerId,
            status: 'running',
            sessionId: event.sessionId,
            directive: event.directive,
            agentType: event.agentType,
            spawnedAt: event.timestamp,
            updatedAt: event.timestamp,
          },
        },
      }
    case 'coordinator.worker_result': {
      const existing = state.workers[event.workerId]
      return {
        ...state,
        workers: {
          ...state.workers,
          [event.workerId]: {
            id: event.workerId,
            status: event.status,
            sessionId: existing?.sessionId ?? event.sessionId,
            directive: existing?.directive ?? '',
            agentType: existing?.agentType ?? 'worker',
            spawnedAt: existing?.spawnedAt ?? event.timestamp,
            updatedAt: event.timestamp,
            summary: event.summary,
          },
        },
      }
    }
    case 'coordinator.synthesis':
      return {
        ...state,
        lastSynthesis: {
          findings: event.findings,
          decisions: event.decisions,
          timestamp: event.timestamp,
        },
      }
    case 'coordinator.checkpoint':
      return event.projectedState
    case 'coordinator.decision':
      return state
  }
}

export function projectTeamState(events: readonly TeamEvent[]): TeamState {
  return events.reduce(applyEvent, initialTeamState())
}

export function renderTeamContext(state: TeamState): string {
  const workers = Object.values(state.workers)
    .sort((a, b) => a.spawnedAt - b.spawnedAt)
    .map(worker => {
      const summary = worker.summary
        ? `\n    <summary>${escapeXml(worker.summary)}</summary>`
        : ''
      return `  <worker id="${escapeXml(worker.id)}" status="${worker.status}" sessionId="${escapeXml(worker.sessionId)}" agentType="${escapeXml(worker.agentType)}">
    <directive>${escapeXml(worker.directive)}</directive>
    <spawnedAt>${worker.spawnedAt}</spawnedAt>
    <updatedAt>${worker.updatedAt}</updatedAt>${summary}
  </worker>`
    })
    .join('\n')

  const synthesis = state.lastSynthesis
    ? `
  <last-synthesis timestamp="${state.lastSynthesis.timestamp}">
    <findings>${escapeXml(state.lastSynthesis.findings)}</findings>
    <decisions>${escapeXml(state.lastSynthesis.decisions)}</decisions>
  </last-synthesis>`
    : ''

  return `<coordinator-team-state>
${workers || '  <workers />'}${synthesis}
</coordinator-team-state>`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
