// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Message queue type definitions for session event queueing.
// Used across messageQueueManager, sessionStorage, and log types.

/**
 * Type of queue operation performed.
 */
export type QueueOperation = 'enqueue' | 'dequeue' | 'remove' | string

/**
 * Message representing an operation in the session event queue.
 */
export type QueueOperationMessage = {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
  [key: string]: unknown
}
