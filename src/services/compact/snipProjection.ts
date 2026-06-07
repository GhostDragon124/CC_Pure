// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Snip projection utilities — used by HISTORY_SNIP feature to compact
// conversation history by snipping out old messages and replacing them
// with boundary markers.
// Dynamically require'd by Message.tsx and QueryEngine.ts.

import type { Message } from 'src/types/message.js'

/**
 * Returns true if the given message is a snip boundary marker.
 * Stub: always returns false.
 */
export const isSnipBoundaryMessage: (message: Message) => boolean = () => false

/**
 * Projects messages through the snip view — returns a filtered/compressed
 * view of the message list. Stub implementation: identity (no-op).
 */
export const projectSnippedView: (messages: Message[]) => Message[] = (messages) => messages
