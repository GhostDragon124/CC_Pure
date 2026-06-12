import { getSessionBlackboard } from './BlackboardSession.js'
import { recordEvent, set } from './BlackboardStore.js'
import {
  recordWorkerResult,
  recordWorkerSpawn,
  recordWorkerStatus,
} from './eventRecorder.js'
import { workerKey } from './kvHelpers.js'

const LIFECYCLE_WRITER = 'blackboard-lifecycle'

function writeWorkerKey(
  workerId: string,
  field: string,
  value: string,
  writer: string = LIFECYCLE_WRITER,
): void {
  try {
    recordEvent(
      getSessionBlackboard(),
      writer,
      `worker_${field}`,
      workerKey(workerId, field),
      value,
    )
  } catch {
    // Blackboard writes must not break agent lifecycle transitions.
  }
}

export function writeWorkerStatus(workerId: string, status: string): void {
  try {
    void recordWorkerStatus(getSessionBlackboard(), workerId, status).catch(
      () => {},
    )
  } catch {
    // Blackboard writes must not break agent lifecycle transitions.
  }
  writeWorkerKey(workerId, 'updated_at', new Date().toISOString())
}

export function writeWorkerTask(workerId: string, task: string): void {
  void Promise.resolve()
    .then(() =>
      recordEvent(
        getSessionBlackboard(),
        LIFECYCLE_WRITER,
        'worker_task',
        workerKey(workerId, 'task'),
        task,
      ),
    )
    .catch(() => {})
}

export function writeWorkerResult(workerId: string, result: string): void {
  try {
    void recordWorkerResult(getSessionBlackboard(), workerId, result).catch(
      () => {},
    )
  } catch {
    // Blackboard writes must not break agent lifecycle transitions.
  }
}

export function writeWorkerSpawn(
  workerId: string,
  directive: string,
  agentType: string,
): void {
  try {
    void recordWorkerSpawn(
      getSessionBlackboard(),
      workerId,
      directive,
      agentType,
    ).catch(() => {})
  } catch {
    // Blackboard writes must not break agent lifecycle transitions.
  }
}

export function writeWorkerHeartbeat(
  workerId: string,
  heartbeat: string,
): void {
  try {
    set(
      getSessionBlackboard(),
      workerKey(workerId, 'heartbeat'),
      heartbeat,
      LIFECYCLE_WRITER,
    )
  } catch {
    // Heartbeats are best effort and intentionally do not emit events.
  }
}
