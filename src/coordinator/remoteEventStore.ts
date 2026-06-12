/**
 * @deprecated Remote JSONL event transport has been superseded by the unified
 * SQLite blackboard events table. Retained only for legacy compatibility.
 */
import { logForDebugging } from 'src/utils/debug.js'
import type { EventStore, TeamEvent } from './teamEventStore.js'

/**
 * Recursively truncate all string values in an object to maxLen characters.
 * This is a defense-in-depth measure to prevent unbounded payloads when
 * sending coordinator internal state over the network.
 */
function truncateDeep(obj: unknown, maxLen = 10_000): unknown {
  if (typeof obj === 'string') {
    return obj.length > maxLen ? obj.slice(0, maxLen) : obj
  }
  if (Array.isArray(obj)) {
    return obj.map(item => truncateDeep(item, maxLen))
  }
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = truncateDeep(v, maxLen)
    }
    return out
  }
  return obj
}

export class RemoteEventStore implements EventStore {
  private readonly serverUrl: string

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/\/+$/, '')
  }

  async append(event: TeamEvent): Promise<void> {
    try {
      const response = await fetch(this.eventsUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // This data is coordinator internal state, not user-supplied file
        // paths. truncateDeep caps string values at 10K chars as a
        // defense-in-depth measure against unbounded payloads.
        body: JSON.stringify(truncateDeep(event)),
      })
      if (!response.ok) {
        logForDebugging(
          'Failed to append remote coordinator team event: HTTP ' +
            response.status,
        )
      }
    } catch (error) {
      logForDebugging(
        'Failed to append remote coordinator team event: ' + String(error),
      )
    }
  }

  async read(since?: number): Promise<TeamEvent[]> {
    try {
      const response = await fetch(this.eventsUrl(since))
      if (!response.ok) {
        logForDebugging(
          'Failed to read remote coordinator team events: HTTP ' +
            response.status,
        )
        return []
      }

      const events = (await response.json()) as unknown
      if (!Array.isArray(events)) {
        logForDebugging(
          'Remote coordinator team events response was not an array',
        )
        return []
      }
      return events as TeamEvent[]
    } catch (error) {
      logForDebugging(
        'Failed to read remote coordinator team events: ' + String(error),
      )
      return []
    }
  }

  async clear(before?: number): Promise<void> {
    try {
      const url =
        before !== undefined
          ? `${this.eventsUrl()}?before=${encodeURIComponent(before)}`
          : this.eventsUrl()
      await fetch(url, { method: 'DELETE' })
    } catch (error) {
      logForDebugging(
        'Failed to clear remote coordinator team events: ' + String(error),
      )
    }
  }

  private eventsUrl(since?: number): string {
    const url = this.serverUrl + '/events'
    return since === undefined
      ? url
      : url + '?since=' + encodeURIComponent(since)
  }
}
