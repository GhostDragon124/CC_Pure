import type { TeamState } from './teamProjection.js'

export type WorkerField =
  | 'status'
  | 'directive'
  | 'agentType'
  | 'summary'
  | 'spawnedAt'
  | 'updatedAt'
  | 'sessionId'

export function workerKey(id: string, field: WorkerField | string): string {
  return `worker:${id}:${field}`
}

export function teamKey(field: string): string {
  return `team:synthesis:${field}`
}

export function coordinatorKey(field: string): string {
  return `coordinator:${field}`
}

export function parseWorkerKey(
  key: string,
): { workerId: string; field: string } | null {
  const match = key.match(/^worker:([^:]+):(.+)$/)
  if (!match) {
    return null
  }
  return { workerId: match[1]!, field: match[2]! }
}

export function getValue(state: TeamState, key: string): string | undefined {
  return state[key]?.value
}

export function getWorkerStatus(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'status'))
}

export function getWorkerDirective(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'directive'))
}

export function getWorkerAgentType(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'agentType'))
}

export function getWorkerSummary(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'summary'))
}

export function getWorkerSpawnedAt(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'spawnedAt'))
}

export function getWorkerUpdatedAt(
  state: TeamState,
  id: string,
): string | undefined {
  return getValue(state, workerKey(id, 'updatedAt'))
}
