import type { CollapseEntry } from './operations.js'

/**
 * Validates that an object looks like a CollapseEntry.
 */
export function isValidEntry(entry: unknown): entry is CollapseEntry {
  if (!entry || typeof entry !== 'object') return false
  const obj = entry as Record<string, unknown>
  return typeof obj.id === 'string' && obj.id.trim() !== ''
}

/**
 * Restores collapse entries and snapshot from persisted session data.
 * Called by ResumeConversation.tsx and sessionRestore.ts when
 * resuming a session that had active context collapses.
 *
 * Validates, deduplicates by id, sorts by createdAt, and replays
 * entries into the in-memory collapse store so projectView() can
 * reconstruct the collapsed view on the next turn.
 *
 * @param rawEntries  Collapse commit entries from session transcript
 * @param snapshot  Collapse snapshot (serialized state at save time)
 * @returns  Validated, deduplicated, sorted CollapseEntry array
 */
export function restoreFromEntries(
  rawEntries: unknown[],
  snapshot: unknown,
): CollapseEntry[] {
  const seenIds = new Set<string>()
  const entries: CollapseEntry[] = []

  // Combine raw entries and snapshot entries (if snapshot is an array)
  const allRaw = [...rawEntries]
  if (Array.isArray(snapshot)) {
    allRaw.push(...(snapshot as unknown[]))
  }

  for (const item of allRaw) {
    if (!isValidEntry(item)) continue
    // Deduplicate by id — keep first occurrence
    if (seenIds.has(item.id)) continue
    seenIds.add(item.id)
    entries.push(item)
  }

  // Sort by createdAt ascending (oldest collapse first)
  entries.sort((a, b) => {
    const aTime =
      typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0
    const bTime =
      typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0
    return aTime - bTime
  })

  return entries
}
