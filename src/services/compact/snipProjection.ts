import { randomUUID } from 'crypto'
import type { Message } from 'src/types/message.js'

/**
 * Fields attached to a snip boundary message — marks where old conversation
 * history was truncated and records what was removed.
 */
export type SnipBoundary = {
  /** Discriminator for type-guard detection */
  role: 'boundary'
  /** When the snip occurred (ISO-8601) */
  snippedAt: string
  /** How many messages were removed */
  messageCount: number
  /** Approximate token count of removed messages */
  tokenCount?: number
  /** Temporal bounds of the removed content */
  dateRange: {
    /** Earliest snipped message timestamp */
    from: string
    /** Latest snipped message timestamp */
    to: string
  }
  /** Optional brief summary of removed content for context preservation */
  summary?: string
}

/**
 * A message that marks a snip boundary in the conversation history.
 * Extends the base Message type with SnipBoundary metadata.
 */
export type SnipBoundaryMessage = Message & { snipBoundary: SnipBoundary }

/**
 * Returns true if the given message is a snip boundary marker.
 */
export function isSnipBoundaryMessage(
  message: Message,
): message is SnipBoundaryMessage {
  const snipBoundary = message.snipBoundary
  return (
    typeof snipBoundary === 'object' &&
    snipBoundary !== null &&
    'role' in snipBoundary &&
    snipBoundary.role === 'boundary'
  )
}

/**
 * Projects messages through the snip view — returns only messages from
 * the most recent snip boundary onward.
 *
 * REPL keeps snipped messages for UI scrollback; this projection ensures
 * the model only receives content after the snip point.
 *
 * @param messages  Full message history (including snipped prefix)
 * @returns  Messages from the last snip boundary to the end
 */
export function projectSnippedView(messages: Message[]): Message[] {
  // Find the last snip boundary — there may be multiple if snipping
  // happened more than once, but only the most recent matters.
  let lastBoundaryIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isSnipBoundaryMessage(messages[i]!)) {
      lastBoundaryIdx = i
      break
    }
  }

  if (lastBoundaryIdx === -1) return messages

  // Include the boundary message itself (it carries the snip metadata)
  // plus everything after it.
  return messages.slice(lastBoundaryIdx)
}

/**
 * Creates a snip boundary message that can be inserted into the message
 * list to mark where old history was truncated.
 */
export function createSnipBoundary(opts: {
  messageCount: number
  tokenCount?: number
  dateRange: { from: string; to: string }
  summary?: string
}): SnipBoundaryMessage {
  const now = new Date().toISOString()
  const snipBoundary: SnipBoundary = {
    role: 'boundary',
    snippedAt: now,
    messageCount: opts.messageCount,
    dateRange: opts.dateRange,
  }

  if (opts.tokenCount !== undefined) snipBoundary.tokenCount = opts.tokenCount
  if (opts.summary !== undefined) snipBoundary.summary = opts.summary

  return {
    type: 'user',
    uuid: randomUUID(),
    message: {
      role: 'user',
      content:
        '[Earlier conversation snipped - ' +
        opts.messageCount +
        ' messages removed]',
    },
    timestamp: now,
    isSidechain: true,
    isEphemeral: true,
    snipBoundary,
  }
}
