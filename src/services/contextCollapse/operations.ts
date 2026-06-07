// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Context collapse operations for projecting messages into a collapsed view.
// Used by context-noninteractive.ts and context.tsx via dynamic require().
// When upstream is available, replace with real implementation that collapses
// conversation spans to reduce token usage.

import type { Message } from 'src/types/message.js'

/**
 * Projects messages through context collapse — returns a filtered/compressed
 * view of the message list. Stub implementation: identity (no-op).
 */
export const projectView: (messages: Message[]) => Message[] = (messages) => messages
