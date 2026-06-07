// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Memory shape telemetry — logs memory recall/write shape for analytics.
// Dynamically require'd by findRelevantMemories.ts and sessionFileAccessHooks.ts
// when MEMORY_SHAPE_TELEMETRY feature is enabled.
// Stub: no-op functions.

import type { MemoryHeader } from './memoryScan.js'
import type { MemoryScope } from '../utils/memoryFileDetection.js'

export const logMemoryRecallShape: (memories: MemoryHeader[], selected: MemoryHeader[]) => void = () => {}
export const logMemoryWriteShape: (toolName: string, toolInput: Record<string, unknown>, filePath: string, scope: MemoryScope) => void = () => {}
