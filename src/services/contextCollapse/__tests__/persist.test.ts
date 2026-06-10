import { describe, expect, test } from 'bun:test'
import type { CollapseEntry } from '../operations.js'
import { restoreFromEntries } from '../persist.js'

function makeEntry(id: string, createdAt: string): CollapseEntry {
  return {
    id,
    span: {
      startIdx: 0,
      endIdx: 0,
      messageIds: [],
    },
    replacement: {
      text: id,
      tokens: 1,
    },
    createdAt,
    depth: 0,
    parentId: null,
    meta: {
      messageCount: 1,
      tokensIn: 10,
      tokensOut: 1,
      strategy: 'truncate',
    },
  }
}

describe('restoreFromEntries', () => {
  test('merges raw entries and array snapshots, filters invalid entries, dedupes, and sorts oldest first', () => {
    const first = makeEntry('same', '2026-01-02T00:00:00.000Z')
    const duplicate = makeEntry('same', '2026-01-01T00:00:00.000Z')
    const oldest = makeEntry('oldest', '2026-01-01T00:00:00.000Z')
    const newest = makeEntry('newest', '2026-01-03T00:00:00.000Z')

    const restored = restoreFromEntries(
      [first, { id: '' }, null, newest],
      [oldest, duplicate],
    )

    expect(restored.map(entry => entry.id)).toEqual([
      'oldest',
      'same',
      'newest',
    ])
    expect(restored.find(entry => entry.id === 'same')).toBe(first)
  })
})
