interface CollapseStats {
  totalMessages: number
  collapsedMessages: number
  emptySpawnWarningEmitted: boolean
  health: {
    totalSpawns: number
    totalErrors: number
    lastError?: string
    emptySpawnWarningEmitted: boolean
    totalEmptySpawns: number
  }
  collapsedSpans: number
  stagedSpans: number
}

export function getStats(): CollapseStats {
  return {
    totalMessages: 0,
    collapsedMessages: 0,
    emptySpawnWarningEmitted: false,
    health: {
      totalSpawns: 0,
      totalErrors: 0,
      emptySpawnWarningEmitted: false,
      totalEmptySpawns: 0,
    },
    collapsedSpans: 0,
    stagedSpans: 0,
  }
}

export function isContextCollapseEnabled(): boolean {
  return false
}

export function subscribe(callback: () => void): () => void {
  return () => {}
}

/** @stub */
export function initContextCollapse(): void {}

/** @stub */
export function resetContextCollapse(): void {}

/** @stub */
export function applyCollapsesIfNeeded(): void {}

/** @stub */
export function isWithheldPromptTooLong(): boolean {
  return false
}

/** @stub */
export function recoverFromOverflow(): void {}
