import type { Database } from 'bun:sqlite'
import { hostname } from 'os'
import { getSessionId } from 'src/bootstrap/state.js'
import { recordEvent } from './BlackboardStore.js'
import { coordinatorKey, teamKey, workerKey } from './kvHelpers.js'

const JANITOR_ACTOR = 'blackboard-janitor'

function getCoordinatorId(): string {
  return process.env.COORDINATOR_ID || hostname()
}

function safeRecord(
  db: Database,
  actor: string,
  type: string,
  key: string,
  value: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    recordEvent(db, actor, type, key, value, payload)
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}

export function recordWorkerStatus(
  db: Database,
  workerId: string,
  status: string,
): Promise<void> {
  return safeRecord(
    db,
    `worker:${workerId}`,
    'worker_status',
    workerKey(workerId, 'status'),
    status,
  )
}

export function recordWorkerResult(
  db: Database,
  workerId: string,
  summary: string,
  status?: string,
): Promise<void> {
  return safeRecord(
    db,
    `worker:${workerId}`,
    'worker_result',
    workerKey(workerId, 'result'),
    summary,
    status ? { status } : undefined,
  )
}

export function recordWorkerSpawn(
  db: Database,
  workerId: string,
  directive: string,
  agentType: string,
): Promise<void> {
  return Promise.all([
    safeRecord(
      db,
      'coordinator',
      'worker_spawn',
      workerKey(workerId, 'status'),
      'spawned',
      { coordinatorId: getCoordinatorId(), sessionId: getSessionId() },
    ),
    safeRecord(
      db,
      'coordinator',
      'worker_spawn',
      workerKey(workerId, 'directive'),
      directive,
      { coordinatorId: getCoordinatorId(), sessionId: getSessionId() },
    ),
    safeRecord(
      db,
      'coordinator',
      'worker_spawn',
      workerKey(workerId, 'agent_type'),
      agentType,
      { coordinatorId: getCoordinatorId(), sessionId: getSessionId() },
    ),
  ]).then(() => undefined)
}

export function recordSynthesis(
  db: Database,
  findings: string,
  decisions: string,
): Promise<void> {
  return Promise.all([
    safeRecord(
      db,
      'coordinator',
      'coordinator_synthesis',
      teamKey('synthesis:findings'),
      findings,
    ),
    safeRecord(
      db,
      'coordinator',
      'coordinator_synthesis',
      teamKey('synthesis:decisions'),
      decisions,
    ),
  ]).then(() => undefined)
}

export function recordDecision(
  db: Database,
  action: string,
  rationale: string,
  workerId?: string,
): Promise<void> {
  return safeRecord(
    db,
    'coordinator',
    'coordinator_decision',
    coordinatorKey('last_decision'),
    action,
    { rationale, ...(workerId ? { workerId } : {}) },
  )
}

export function recordCoordinatorSession(
  db: Database,
  sessionId: string,
): Promise<void> {
  return safeRecord(
    db,
    'coordinator',
    'coordinator_session_started',
    coordinatorKey('session_started'),
    sessionId,
    { coordinatorId: getCoordinatorId(), sessionId },
  )
}

export function recordJanitorAction(
  db: Database,
  action: string,
  key: string,
  detail: string,
): Promise<void> {
  return safeRecord(db, JANITOR_ACTOR, 'janitor_action', key, action, {
    detail,
    ...(action === 'delete_orphaned_key' ? { delete: true } : {}),
  })
}
