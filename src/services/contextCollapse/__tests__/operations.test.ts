import { randomUUID } from 'crypto'
import { describe, expect, test } from 'bun:test'
import type { UUID } from 'crypto'
import type { Message } from 'src/types/message.js'
import {
  createSummaryMessage,
  type CollapseEntry,
  projectView,
} from '../operations.js'

function makeMessage(label: string): Message {
  return {
    type: 'user',
    uuid: randomUUID() as UUID,
    message: {
      role: 'user',
      content: label,
    },
  }
}

function makeEntry(
  id: string,
  startIdx: number,
  endIdx: number,
  summary: string,
): CollapseEntry {
  return {
    id,
    span: {
      startIdx,
      endIdx,
      messageIds: [],
    },
    replacement: {
      text: summary,
      tokens: 8,
    },
    createdAt: `2026-01-01T00:00:0${startIdx}.000Z`,
    depth: 0,
    parentId: null,
    meta: {
      messageCount: endIdx - startIdx + 1,
      tokensIn: 100,
      tokensOut: 8,
      strategy: 'llm-summary',
    },
  }
}

describe('projectView', () => {
  test('returns the original messages when there is no collapse log', () => {
    const messages = [makeMessage('one')]

    expect(projectView(messages)).toBe(messages)
    expect(projectView(messages, [])).toBe(messages)
  })

  test('replaces collapsed spans with summaries sorted by start index', () => {
    const messages = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5'].map(makeMessage)
    const projected = projectView(messages, [
      makeEntry('later', 4, 5, 'later summary'),
      makeEntry('earlier', 1, 2, 'earlier summary'),
    ])

    expect(projected).toHaveLength(4)
    expect(projected[0]).toBe(messages[0])
    expect(projected[1]?.message?.content).toBe(
      '[Collapsed 2 messages]\n\nearlier summary',
    )
    expect(projected[2]).toBe(messages[3])
    expect(projected[3]?.message?.content).toBe(
      '[Collapsed 2 messages]\n\nlater summary',
    )
  })
})

describe('createSummaryMessage', () => {
  test('creates a synthetic user summary message with a fresh uuid', () => {
    const message = createSummaryMessage(makeEntry('entry', 0, 2, 'summary'))

    expect(message.type).toBe('user')
    expect(typeof message.uuid).toBe('string')
    expect(message.message?.role).toBe('user')
    expect(message.message?.content).toBe('[Collapsed 3 messages]\n\nsummary')
    expect(message.isSidechain).toBe(true)
    expect(message.isEphemeral).toBe(true)
  })
})
