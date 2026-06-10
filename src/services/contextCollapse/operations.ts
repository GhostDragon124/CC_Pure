import { randomUUID } from 'crypto'
import type { Message } from 'src/types/message.js'

/**
 * Strategy used to collapse a message span.
 */
export type CollapseStrategy = 'llm-summary' | 'truncate' | 'sliding-window'

/**
 * Records a single context collapse operation — a span of messages
 * compressed into a summary to fit within context limits.
 */
export type CollapseEntry = {
  /** Unique identifier for this collapse */
  id: string
  /** Which messages were collapsed */
  span: {
    /** First message index in the original sequence (inclusive) */
    startIdx: number
    /** Last message index in the original sequence (inclusive) */
    endIdx: number
    /** Message IDs for tracking across reshuffles */
    messageIds: string[]
  }
  /** The summary that replaces the collapsed span */
  replacement: {
    /** Summary content */
    text: string
    /** Token count of the summary */
    tokens: number
  }
  /** When this collapse was performed (ISO-8601) */
  createdAt: string
  /** Nesting depth — 0 for top-level, 1+ for recursive collapses */
  depth: number
  /** Parent collapse ID if this is nested within another collapse */
  parentId: string | null
  /** Debug and analysis metadata */
  meta: {
    /** Original message count in the span */
    messageCount: number
    /** Estimated token count before collapse */
    tokensIn: number
    /** Estimated token count after collapse */
    tokensOut: number
    /** Collapse strategy used */
    strategy: CollapseStrategy
  }
}

/**
 * Creates a summary message that represents a collapsed span.
 * Uses a factory pattern with sensible defaults for synthetic messages
 * so callers don't need `as unknown as Message` type bypasses.
 */
export function createSummaryMessage(entry: CollapseEntry): Message {
  return {
    type: 'user',
    uuid: randomUUID(),
    message: {
      role: 'user',
      content: `[Collapsed ${entry.meta.messageCount} messages]\n\n${entry.replacement.text}`,
    },
    timestamp: entry.createdAt,
    isSidechain: true,
    isEphemeral: true,
  }
}

/**
 * Projects messages through a collapse commit log, returning a filtered
 * view where collapsed spans are replaced by summary messages.
 *
 * The collapse log is replayed on every entry so collapses persist across
 * turns — the full history lives in the REPL array, but the projected view
 * is what gets sent to the model.
 *
 * @param messages  Full message history
 * @param collapseLog  Chronological list of collapse entries (optional — reads
 *   from the internal collapse store when omitted)
 * @returns  Projected view with collapsed spans replaced by summaries
 */
export function projectView(
  messages: Message[],
  collapseLog?: CollapseEntry[],
): Message[] {
  if (!collapseLog || collapseLog.length === 0) return messages

  // Sort by startIdx ascending so later collapses don't break earlier indices
  const sorted = [...collapseLog].sort(
    (a, b) => a.span.startIdx - b.span.startIdx,
  )

  // Build a set of indices to skip
  const skipIndices = new Set<number>()
  for (const entry of sorted) {
    for (let i = entry.span.startIdx; i <= entry.span.endIdx; i++) {
      skipIndices.add(i)
    }
  }

  // Build projected view: keep non-collapsed messages, insert summary at collapse point
  const result: Message[] = []
  const insertions = new Map<number, Message>() // idx → summary message

  for (const entry of sorted) {
    insertions.set(entry.span.startIdx, createSummaryMessage(entry))
  }

  for (let i = 0; i < messages.length; i++) {
    if (skipIndices.has(i)) {
      // Insert summary on first skip of each span
      if (insertions.has(i)) {
        result.push(insertions.get(i)!)
      }
      continue
    }
    result.push(messages[i]!)
  }

  return result
}
