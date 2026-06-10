import { describe, test } from 'bun:test'

import type {
  QueueEventSource,
  QueueOperation,
  QueueOperationMessage,
  QueuePriority,
} from '../messageQueueTypes.js'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type Assert<T extends true> = T

type _QueueOperationMatchesTranscriptOperations = Assert<
  Equal<QueueOperation, 'enqueue' | 'dequeue' | 'remove' | 'popAll'>
>

type _QueuePriorityIsSelfContained = Assert<
  Equal<QueuePriority, 'now' | 'next' | 'later'>
>

type _QueueEventSourceIsDiscriminated = Assert<
  Equal<
    QueueEventSource,
    | { type: 'user' }
    | { type: 'system'; trigger: string }
    | { type: 'agent'; agentId: string }
  >
>

const operationMessage = {
  type: 'queue-operation',
  operation: 'enqueue',
  timestamp: '2026-06-10T00:00:00.000Z',
  sessionId: 'session-id',
  content: 'queued command',
  priority: 'next',
  source: { type: 'system', trigger: 'sleep-drain' },
  depthBefore: 0,
  depthAfter: 1,
} satisfies QueueOperationMessage

void operationMessage

describe('message queue transcript types', () => {
  test('are verified at compile time', () => {})
})
