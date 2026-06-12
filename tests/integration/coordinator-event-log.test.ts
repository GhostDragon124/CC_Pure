import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import { rm } from 'fs/promises'
import { join } from 'path'
import type { Database } from 'bun:sqlite'
import {
  closeSessionBlackboard,
  getSessionBlackboard,
} from '../../src/blackboard/BlackboardSession.js'
import {
  get,
  getByPrefix,
  getEvents,
} from '../../src/blackboard/BlackboardStore.js'
import {
  recordCoordinatorSession,
  recordWorkerResult,
  recordWorkerSpawn,
  recordWorkerStatus,
} from '../../src/blackboard/eventRecorder.js'
import { buildPostCompactMessages } from '../../src/services/compact/compact.js'
import type { CompactionResult } from '../../src/services/compact/compact.js'
import { switchSession } from '../../src/bootstrap/state.js'
import {
  createSystemMessage,
  createUserMessage,
} from '../../src/utils/messages.js'

mock.module('bun:bundle', () => ({
  feature: (name: string) => name === 'COORDINATOR_MODE',
}))

const CONFIG_DIR = '/tmp/ccp-blackboard-integration'
const SESSION_ID = 'blackboard-integration-session'

let clearEventsBeforeCheckpoint: (
  teamContext: string | undefined,
) => Promise<void>

beforeAll(async () => {
  const queryModule = await import('../../src/query.js')
  clearEventsBeforeCheckpoint = queryModule.clearEventsBeforeCheckpoint
})

afterEach(async () => {
  closeSessionBlackboard()
  delete process.env.CLAUDE_CODE_COORDINATOR_MODE
  delete process.env.CLAUDE_CONFIG_DIR
  await rm(CONFIG_DIR, { recursive: true, force: true })
})

describe('coordinator blackboard integration', () => {
  test('recovers team state from SQLite blackboard after compaction', async () => {
    const db = openTestBlackboard()

    await recordWorkerSpawn(db, 'worker-1', 'Investigate tests', 'worker')
    await recordWorkerSpawn(db, 'worker-2', 'Inspect implementation', 'worker')
    await recordWorkerStatus(db, 'worker-1', 'completed')
    await recordWorkerResult(db, 'worker-1', 'Tests are green', 'completed')

    const teamContext = buildTestBlackboardTeamContext(db)
    const compacted = buildPostCompactMessages(
      makeCompactionResult(),
      teamContext,
    )

    expect(teamContext).toContain('worker:worker-1:status = completed')
    expect(teamContext).toContain('worker:worker-2:status = spawned')
    expect(teamContext).toContain('Blackboard audit events: 8')
    expect(compacted.at(-1)?.type).toBe('system')
    expect(compacted.at(-1)?.content).toContain('worker-1')
    expect(compacted.at(-1)?.content).toContain('worker-2')
  })

  test('writes a SQLite checkpoint event without clearing audit history', async () => {
    const db = openTestBlackboard()
    process.env.COORDINATOR_ID = 'coordinator-test'

    const originalDateNow = Date.now
    Date.now = () => 200

    try {
      await recordWorkerSpawn(
        db,
        'worker-1',
        'Investigate checkpoint cleanup',
        'worker',
      )
      await recordWorkerStatus(db, 'worker-1', 'completed')
      await recordWorkerResult(
        db,
        'worker-1',
        'Checkpoint cleanup is ready',
        'completed',
      )

      await clearEventsBeforeCheckpoint('<coordinator-team-state />')

      const events = getEvents(db)
      expect(events).toHaveLength(6)
      expect(events.at(-1)).toMatchObject({
        actor: 'coordinator',
        type: 'coordinator_checkpoint',
        key: 'coordinator:last_checkpoint',
        value: '200',
        payload: {
          teamContext: '<coordinator-team-state />',
          sessionId: SESSION_ID,
        },
      })
      expect(get(db, 'worker:worker-1:status')?.value).toBe('completed')
      expect(get(db, 'coordinator:last_checkpoint')?.value).toBe('200')
    } finally {
      Date.now = originalDateNow
      delete process.env.COORDINATOR_ID
    }
  })

  test('records coordinator session start in SQLite', async () => {
    const db = openTestBlackboard()

    await recordCoordinatorSession(db, SESSION_ID)

    expect(get(db, 'coordinator:session_started')).toMatchObject({
      value: SESSION_ID,
      updatedBy: 'coordinator',
    })
    expect(getEvents(db).at(-1)).toMatchObject({
      actor: 'coordinator',
      type: 'coordinator_session_started',
      key: 'coordinator:session_started',
      value: SESSION_ID,
    })
  })
})

function openTestBlackboard(): Database {
  process.env.CLAUDE_CONFIG_DIR = CONFIG_DIR
  process.env.CLAUDE_CODE_COORDINATOR_MODE = '1'
  switchSession(SESSION_ID as never)
  closeSessionBlackboard()
  return getSessionBlackboard()
}

function buildTestBlackboardTeamContext(db: Database): string {
  const entries = [
    ...getByPrefix(db, 'worker:'),
    ...getByPrefix(db, 'team:'),
    ...getByPrefix(db, 'coordinator:'),
  ]
  const lines = entries.map(
    entry =>
      `- ${entry.key} = ${entry.value} (v${entry.version}, by ${entry.updatedBy}, at ${entry.updatedAt})`,
  )
  return [
    `Blackboard team state:\n${lines.join('\n')}`,
    `Blackboard audit events: ${getEvents(db).length}`,
  ].join('\n\n')
}

function makeCompactionResult(): CompactionResult {
  return {
    boundaryMarker: createSystemMessage('compact boundary', 'info'),
    summaryMessages: [createUserMessage({ content: 'summary', isMeta: true })],
    attachments: [],
    hookResults: [],
    messagesToKeep: [],
  }
}
