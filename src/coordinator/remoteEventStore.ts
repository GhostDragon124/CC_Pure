import { logForDebugging } from 'src/utils/debug.js'
import type { EventStore, TeamEvent } from './teamEventStore.js'

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
        body: JSON.stringify(event),
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
