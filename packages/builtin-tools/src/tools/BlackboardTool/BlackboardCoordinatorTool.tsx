import { z } from 'zod/v4'
import { getSessionBlackboard } from 'src/blackboard/BlackboardSession.js'
import type {
  BlackboardEntry,
  BlackboardEvent,
} from 'src/blackboard/BlackboardTypes.js'
import { get, getByPrefix, getEvents } from 'src/blackboard/BlackboardStore.js'
import { buildTool, type ToolResultBlockParam } from 'src/Tool.js'
import { lazySchema } from 'src/utils/lazySchema.js'
import { BLACKBOARD_COORDINATOR_TOOL_NAME } from './constants.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['read', 'scan'])
      .describe('Coordinator blackboard operation to perform.'),
    key: z
      .string()
      .optional()
      .describe('Exact blackboard key to read when action is read.'),
    prefix: z
      .string()
      .optional()
      .describe('Prefix to scan when action is read and key is omitted.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

const entrySchema = z.strictObject({
  key: z.string(),
  value: z.string(),
  version: z.number(),
  updatedAt: z.string(),
  updatedBy: z.string(),
})

const anomalySchema = z.strictObject({
  key: z.string(),
  kind: z.string(),
  detail: z.string(),
})

const outputSchema = lazySchema(() =>
  z.strictObject({
    success: z.boolean(),
    action: z.enum(['read', 'scan']),
    entry: entrySchema.nullable().optional(),
    entries: z.array(entrySchema).optional(),
    anomalies: z.array(anomalySchema).optional(),
    eventCount: z.number().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

function workerIdFromStatusKey(key: string): string | null {
  if (!key.startsWith('worker:') || !key.endsWith(':status')) return null
  return key.slice('worker:'.length, key.length - ':status'.length)
}

function scanAnomalies(entries: BlackboardEntry[]): Output['anomalies'] {
  const byKey = new Map(entries.map(entry => [entry.key, entry]))
  const anomalies: NonNullable<Output['anomalies']> = []

  for (const entry of entries) {
    if (!entry.key.endsWith(':status')) continue

    if (['dead', 'orphaned', 'failed'].includes(entry.value)) {
      anomalies.push({
        key: entry.key,
        kind: entry.value,
        detail: `Worker status is ${entry.value}`,
      })
      continue
    }

    if (!['running', 'spawned', 'waiting'].includes(entry.value)) continue

    const workerId = workerIdFromStatusKey(entry.key)
    if (!workerId) continue

    const heartbeatKey = `worker:${workerId}:heartbeat`
    if (!byKey.has(heartbeatKey)) {
      anomalies.push({
        key: entry.key,
        kind: 'missing_heartbeat',
        detail: `Worker has active status without ${heartbeatKey}`,
      })
    }
  }

  return anomalies
}

function scanEventAnomalies(
  entries: BlackboardEntry[],
  events: BlackboardEvent[],
): Output['anomalies'] {
  const byKey = new Map(entries.map(entry => [entry.key, entry]))
  const latestByKey = new Map<string, BlackboardEvent>()

  for (const event of events) {
    latestByKey.set(event.key, event)
  }

  const anomalies: NonNullable<Output['anomalies']> = []
  for (const [key, event] of latestByKey) {
    const entry = byKey.get(key)
    if (!entry || entry.value === event.value) continue
    anomalies.push({
      key,
      kind: 'event_kv_mismatch',
      detail: `Latest event value is ${event.value}, but kv value is ${entry.value}`,
    })
  }
  return anomalies
}

export const BlackboardCoordinatorTool = buildTool({
  name: BLACKBOARD_COORDINATOR_TOOL_NAME,
  searchHint: 'read scan shared blackboard coordinator worker state',
  maxResultSizeChars: 100_000,
  strict: true,
  shouldDefer: true,

  async description() {
    return 'Read and scan shared blackboard state for coordinator mode'
  },

  async prompt() {
    return `Use the coordinator blackboard to rehydrate team state after compaction or inspect worker state.

Actions:
- read: provide key for one entry, or prefix for a scan
- scan: returns worker entries plus simple anomaly summaries`
  },

  get inputSchema(): InputSchema {
    return inputSchema()
  },

  get outputSchema(): OutputSchema {
    return outputSchema()
  },

  isConcurrencySafe() {
    return true
  },

  isReadOnly() {
    return true
  },

  async validateInput(input) {
    if (input.action === 'read' && !input.key && !input.prefix) {
      return {
        result: false,
        message: 'BlackboardCoordinator read requires key or prefix',
        errorCode: 9,
      }
    }
    return { result: true }
  },

  renderToolUseMessage(input: Partial<Input>) {
    if (input.action === 'scan') return 'Blackboard scan'
    return `Blackboard read ${input.key ?? input.prefix ?? ''}`.trim()
  },

  mapToolResultToToolResultBlockParam(
    content: Output,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: JSON.stringify(content),
    }
  },

  async call(input) {
    const db = getSessionBlackboard()
    const events = getEvents(db)

    if (input.action === 'scan') {
      const entries = getByPrefix(db, 'worker:')
      return {
        data: {
          success: true,
          action: input.action,
          entries,
          anomalies: [
            ...(scanAnomalies(entries) ?? []),
            ...(scanEventAnomalies(entries, events) ?? []),
          ],
          eventCount: events.length,
        },
      }
    }

    if (input.key) {
      return {
        data: {
          success: true,
          action: input.action,
          entry: get(db, input.key),
          eventCount: events.length,
        },
      }
    }

    return {
      data: {
        success: true,
        action: input.action,
        entries: getByPrefix(db, input.prefix ?? ''),
        eventCount: events.length,
      },
    }
  },
})
