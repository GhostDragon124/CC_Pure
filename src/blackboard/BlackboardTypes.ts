export const BLACKBOARD_WORKER_NAMESPACE = 'worker:' as const
export const BLACKBOARD_TEAM_NAMESPACE = 'team:' as const
export const BLACKBOARD_COORDINATOR_NAMESPACE = 'coordinator:' as const

export const BLACKBOARD_NAMESPACES = [
  BLACKBOARD_WORKER_NAMESPACE,
  BLACKBOARD_TEAM_NAMESPACE,
  BLACKBOARD_COORDINATOR_NAMESPACE,
] as const

export type BlackboardNamespace = (typeof BLACKBOARD_NAMESPACES)[number]

export type WorkerKey =
  `${typeof BLACKBOARD_WORKER_NAMESPACE}${string}:${string}`
export type TeamKey = `${typeof BLACKBOARD_TEAM_NAMESPACE}${string}`
export type CoordinatorKey =
  `${typeof BLACKBOARD_COORDINATOR_NAMESPACE}${string}`

export type BlackboardKey = WorkerKey | TeamKey | CoordinatorKey

export type BlackboardEntry = {
  key: string
  value: string
  version: number
  updatedAt: string
  updatedBy: string
}

export type BlackboardEvent = {
  id: number
  ts: number
  actor: string
  type: string
  key: string
  value: string
  payload: Record<string, unknown>
}
