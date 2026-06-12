import type { BlackboardEntry } from './BlackboardTypes.js'

export type WorkerField =
  | 'agent_type'
  | 'directive'
  | 'heartbeat'
  | 'result'
  | 'status'
  | 'task'
  | 'updated_at'
  | (string & {})

export function workerKey(id: string, field: WorkerField): string {
  return `worker:${id}:${field}`
}

export function teamKey(field: string): string {
  return `team:${field}`
}

export function coordinatorKey(field: string): string {
  return `coordinator:${field}`
}

export function parseWorkerKey(
  key: string,
): { id: string; field: string } | null {
  if (!key.startsWith('worker:')) return null

  const rest = key.slice('worker:'.length)
  const separator = rest.lastIndexOf(':')
  if (separator <= 0 || separator === rest.length - 1) return null

  return {
    id: rest.slice(0, separator),
    field: rest.slice(separator + 1),
  }
}

export function entriesByKey(
  entries: readonly BlackboardEntry[],
): Map<string, BlackboardEntry> {
  return new Map(entries.map(entry => [entry.key, entry]))
}

export function getWorkerField(
  state: ReadonlyMap<string, BlackboardEntry> | readonly BlackboardEntry[],
  id: string,
  field: WorkerField,
): string | undefined {
  const byKey = 'get' in state ? state : entriesByKey(state)
  return byKey.get(workerKey(id, field))?.value
}

export function getWorkerStatus(
  state: ReadonlyMap<string, BlackboardEntry> | readonly BlackboardEntry[],
  id: string,
): string | undefined {
  return getWorkerField(state, id, 'status')
}
