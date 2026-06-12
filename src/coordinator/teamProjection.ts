import { parseWorkerKey, teamKey, workerKey } from './kvHelpers.js'
import type { TeamEvent } from './teamEventStore.js'

export type WorkerStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
  | 'orphaned'

export type TeamStateValue = {
  value: string
  writer: string
  timestamp: number
}

export type TeamState = Record<string, TeamStateValue>

export type LegacyTeamWorker = {
  id: string
  status: WorkerStatus
  sessionId: string
  directive: string
  agentType: string
  spawnedAt: number
  updatedAt: number
  summary?: string
}

export type LegacyTeamState = {
  workers: Record<string, LegacyTeamWorker>
  lastSynthesis?: {
    findings: string
    decisions: string
    timestamp: number
  }
}

type RenderWorker = {
  id: string
  status: string
  sessionId: string
  directive: string
  agentType: string
  spawnedAt: string
  updatedAt: string
  summary?: string
}

export function initialTeamState(): TeamState {
  return {}
}

export function applyEvent(state: TeamState, event: TeamEvent): TeamState {
  if (event.version > 1) {
    return state
  }

  switch (event.type) {
    case 'coordinator.kv':
      return setKv(state, event.key, event.value, event.writer, event.timestamp)
    case 'coordinator.session_started':
      return orphanRunningWorkersFromOtherSessions(state, event.sessionId, {
        writer: event.coordinatorId,
        timestamp: event.timestamp,
      })
    case 'coordinator.worker_spawned':
      return setKvs(state, event.coordinatorId, event.timestamp, [
        [workerKey(event.workerId, 'status'), 'running'],
        [workerKey(event.workerId, 'sessionId'), event.sessionId],
        [workerKey(event.workerId, 'directive'), event.directive],
        [workerKey(event.workerId, 'agentType'), event.agentType],
        [workerKey(event.workerId, 'spawnedAt'), String(event.timestamp)],
        [workerKey(event.workerId, 'updatedAt'), String(event.timestamp)],
      ])
    case 'coordinator.worker_result': {
      const existingSessionId =
        state[workerKey(event.workerId, 'sessionId')]?.value ?? event.sessionId
      const existingDirective =
        state[workerKey(event.workerId, 'directive')]?.value ?? ''
      const existingAgentType =
        state[workerKey(event.workerId, 'agentType')]?.value ?? 'worker'
      const existingSpawnedAt =
        state[workerKey(event.workerId, 'spawnedAt')]?.value ??
        String(event.timestamp)

      return setKvs(state, event.coordinatorId, event.timestamp, [
        [workerKey(event.workerId, 'status'), event.status],
        [workerKey(event.workerId, 'sessionId'), existingSessionId],
        [workerKey(event.workerId, 'directive'), existingDirective],
        [workerKey(event.workerId, 'agentType'), existingAgentType],
        [workerKey(event.workerId, 'spawnedAt'), existingSpawnedAt],
        [workerKey(event.workerId, 'updatedAt'), String(event.timestamp)],
        [workerKey(event.workerId, 'summary'), event.summary],
      ])
    }
    case 'coordinator.synthesis':
      return setKvs(state, event.coordinatorId, event.timestamp, [
        [teamKey('findings'), event.findings],
        [teamKey('decisions'), event.decisions],
        [teamKey('timestamp'), String(event.timestamp)],
      ])
    case 'coordinator.checkpoint':
      return normalizeCheckpointState(event.projectedState)
    case 'coordinator.decision':
      return state
  }
}

export function projectTeamState(events: readonly TeamEvent[]): TeamState {
  return events.reduce(applyEvent, initialTeamState())
}

export function renderTeamContext(state: TeamState): string {
  const workers = collectWorkers(state)
    .sort((a, b) => Number(a.spawnedAt) - Number(b.spawnedAt))
    .map(worker => {
      const summary = worker.summary
        ? `\n    <summary>${escapeXml(worker.summary)}</summary>`
        : ''
      return `  <worker id="${escapeXml(worker.id)}" status="${escapeXml(worker.status)}" sessionId="${escapeXml(worker.sessionId)}" agentType="${escapeXml(worker.agentType)}">
    <directive>${escapeXml(worker.directive)}</directive>
    <spawnedAt>${escapeXml(worker.spawnedAt)}</spawnedAt>
    <updatedAt>${escapeXml(worker.updatedAt)}</updatedAt>${summary}
  </worker>`
    })
    .join('\n')

  const synthesis = state[teamKey('findings')]
    ? `
  <last-synthesis timestamp="${escapeXml(state[teamKey('timestamp')]?.value ?? '')}">
    <findings>${escapeXml(state[teamKey('findings')]?.value ?? '')}</findings>
    <decisions>${escapeXml(state[teamKey('decisions')]?.value ?? '')}</decisions>
  </last-synthesis>`
    : ''

  return `<coordinator-team-state>
${workers || '  <workers />'}${synthesis}
</coordinator-team-state>`
}

function setKv(
  state: TeamState,
  key: string,
  value: string,
  writer: string,
  timestamp: number,
): TeamState {
  return {
    ...state,
    [key]: { value, writer, timestamp },
  }
}

function setKvs(
  state: TeamState,
  writer: string,
  timestamp: number,
  entries: ReadonlyArray<readonly [string, string]>,
): TeamState {
  const next = { ...state }
  for (const [key, value] of entries) {
    next[key] = { value, writer, timestamp }
  }
  return next
}

function orphanRunningWorkersFromOtherSessions(
  state: TeamState,
  sessionId: string,
  event: { writer: string; timestamp: number },
): TeamState {
  let next: TeamState | undefined
  for (const workerId of collectWorkerIds(state)) {
    const statusKey = workerKey(workerId, 'status')
    const workerSessionId = state[workerKey(workerId, 'sessionId')]?.value
    if (
      state[statusKey]?.value === 'running' &&
      workerSessionId !== sessionId
    ) {
      next ??= { ...state }
      next[statusKey] = {
        value: 'orphaned',
        writer: event.writer,
        timestamp: event.timestamp,
      }
      next[workerKey(workerId, 'updatedAt')] = {
        value: String(event.timestamp),
        writer: event.writer,
        timestamp: event.timestamp,
      }
    }
  }
  return next ?? state
}

function normalizeCheckpointState(
  state: TeamState | LegacyTeamState,
): TeamState {
  if (isLegacyTeamState(state)) {
    return convertLegacyState(state)
  }
  return state
}

function isLegacyTeamState(
  state: TeamState | LegacyTeamState,
): state is LegacyTeamState {
  return 'workers' in state
}

function convertLegacyState(state: LegacyTeamState): TeamState {
  let next = initialTeamState()
  for (const worker of Object.values(state.workers)) {
    next = setKvs(next, 'checkpoint', worker.updatedAt, [
      [workerKey(worker.id, 'status'), worker.status],
      [workerKey(worker.id, 'sessionId'), worker.sessionId],
      [workerKey(worker.id, 'directive'), worker.directive],
      [workerKey(worker.id, 'agentType'), worker.agentType],
      [workerKey(worker.id, 'spawnedAt'), String(worker.spawnedAt)],
      [workerKey(worker.id, 'updatedAt'), String(worker.updatedAt)],
      ...(worker.summary
        ? ([[workerKey(worker.id, 'summary'), worker.summary]] as const)
        : []),
    ])
  }
  if (state.lastSynthesis) {
    next = setKvs(next, 'checkpoint', state.lastSynthesis.timestamp, [
      [teamKey('findings'), state.lastSynthesis.findings],
      [teamKey('decisions'), state.lastSynthesis.decisions],
      [teamKey('timestamp'), String(state.lastSynthesis.timestamp)],
    ])
  }
  return next
}

function collectWorkerIds(state: TeamState): string[] {
  const ids = new Set<string>()
  for (const key of Object.keys(state)) {
    const parsed = parseWorkerKey(key)
    if (parsed) {
      ids.add(parsed.workerId)
    }
  }
  return Array.from(ids)
}

function collectWorkers(state: TeamState): RenderWorker[] {
  return collectWorkerIds(state).map(id => ({
    id,
    status: state[workerKey(id, 'status')]?.value ?? 'running',
    sessionId: state[workerKey(id, 'sessionId')]?.value ?? '',
    directive: state[workerKey(id, 'directive')]?.value ?? '',
    agentType: state[workerKey(id, 'agentType')]?.value ?? 'worker',
    spawnedAt: state[workerKey(id, 'spawnedAt')]?.value ?? '',
    updatedAt: state[workerKey(id, 'updatedAt')]?.value ?? '',
    summary: state[workerKey(id, 'summary')]?.value,
  }))
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
