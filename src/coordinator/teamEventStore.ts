import { mkdir, readFile, appendFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { getProjectRoot } from 'src/bootstrap/state.js'
import { logForDebugging } from 'src/utils/debug.js'
import type { TeamState } from './teamProjection.js'

export type BaseTeamEvent = {
  version: 1
  timestamp: number
  coordinatorId: string
  sessionId: string
}

export type WorkerSpawnedEvent = BaseTeamEvent & {
  type: 'coordinator.worker_spawned'
  workerId: string
  directive: string
  agentType: string
}

export type WorkerResultEvent = BaseTeamEvent & {
  type: 'coordinator.worker_result'
  workerId: string
  status: 'completed' | 'failed' | 'killed'
  summary: string
}

export type CoordinatorSynthesisEvent = BaseTeamEvent & {
  type: 'coordinator.synthesis'
  findings: string
  decisions: string
}

export type CoordinatorDecisionEvent = BaseTeamEvent & {
  type: 'coordinator.decision'
  action: string
  workerId?: string
  rationale: string
}

export type CoordinatorSessionStartedEvent = BaseTeamEvent & {
  type: 'coordinator.session_started'
}

export type CoordinatorCheckpointEvent = BaseTeamEvent & {
  type: 'coordinator.checkpoint'
  projectedState: TeamState
}

export type TeamEvent =
  | WorkerSpawnedEvent
  | WorkerResultEvent
  | CoordinatorSynthesisEvent
  | CoordinatorDecisionEvent
  | CoordinatorSessionStartedEvent
  | CoordinatorCheckpointEvent

export interface EventStore {
  append(event: TeamEvent): Promise<void>
  read(since?: number): Promise<TeamEvent[]>
  clear(before?: number): Promise<void>
}

export class LocalFileEventStore implements EventStore {
  private readonly filePath: string

  constructor(
    filePath = join(getProjectRoot(), '.claude', 'team', 'events.jsonl'),
  ) {
    this.filePath = filePath
  }

  async append(event: TeamEvent): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true })
      await appendFile(this.filePath, `${JSON.stringify(event)}\n`, 'utf8')
    } catch (error) {
      logForDebugging(
        `Failed to append coordinator team event: ${String(error)}`,
      )
    }
  }

  async read(since?: number): Promise<TeamEvent[]> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const events: TeamEvent[] = []
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        try {
          const event = JSON.parse(trimmed) as TeamEvent
          if (since === undefined || event.timestamp > since) {
            events.push(event)
          }
        } catch (error) {
          logForDebugging(
            `Failed to parse coordinator team event line: ${String(error)}`,
          )
        }
      }
      return events
    } catch (error) {
      logForDebugging(
        `Failed to read coordinator team events: ${String(error)}`,
      )
      return []
    }
  }

  async clear(before?: number): Promise<void> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const lines = content.split('\n')
      if (before === undefined) {
        await writeFile(this.filePath, '', 'utf8')
        return
      }

      const kept = lines.filter(line => {
        const trimmed = line.trim()
        if (!trimmed) {
          return false
        }
        try {
          const event = JSON.parse(trimmed) as TeamEvent
          return event.timestamp >= before
        } catch {
          return true
        }
      })
      await writeFile(
        this.filePath,
        kept.join('\n') + (kept.length > 0 ? '\n' : ''),
        'utf8',
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logForDebugging(
          'Failed to clear coordinator team events: ' + String(error),
        )
      }
    }
  }
}
