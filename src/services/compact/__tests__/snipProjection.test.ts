import { randomUUID } from 'crypto'
import { describe, expect, test } from 'bun:test'
import type { UUID } from 'crypto'
import type { Message } from 'src/types/message.js'
import {
  createSnipBoundary,
  isSnipBoundaryMessage,
  projectSnippedView,
} from '../snipProjection.js'

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

describe('projectSnippedView', () => {
  test('returns original messages when there is no boundary', () => {
    const messages = [makeMessage('one')]

    expect(projectSnippedView(messages)).toBe(messages)
  })

  test('returns messages from the last snip boundary onward', () => {
    const firstBoundary = createSnipBoundary({
      messageCount: 2,
      dateRange: { from: '2026-01-01', to: '2026-01-02' },
    })
    const secondBoundary = createSnipBoundary({
      messageCount: 3,
      tokenCount: 42,
      dateRange: { from: '2026-01-03', to: '2026-01-04' },
      summary: 'previous work',
    })
    const tail = makeMessage('tail')
    const messages = [
      makeMessage('before'),
      firstBoundary,
      makeMessage('middle'),
      secondBoundary,
      tail,
    ]

    expect(projectSnippedView(messages)).toEqual([secondBoundary, tail])
  })
})

describe('createSnipBoundary', () => {
  test('creates a detectable synthetic boundary message', () => {
    const boundary = createSnipBoundary({
      messageCount: 3,
      tokenCount: 42,
      dateRange: { from: '2026-01-01', to: '2026-01-02' },
      summary: 'summary',
    })

    expect(isSnipBoundaryMessage(boundary)).toBe(true)
    expect(boundary.type).toBe('user')
    expect(typeof boundary.uuid).toBe('string')
    expect(boundary.message?.content).toBe(
      '[Earlier conversation snipped - 3 messages removed]',
    )
    expect(boundary.snipBoundary).toMatchObject({
      role: 'boundary',
      messageCount: 3,
      tokenCount: 42,
      dateRange: { from: '2026-01-01', to: '2026-01-02' },
      summary: 'summary',
    })
  })
})
