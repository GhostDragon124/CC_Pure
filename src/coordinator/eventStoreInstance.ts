import { hostname } from 'os'
import { RemoteEventStore } from './remoteEventStore.js'
import { LocalFileEventStore, type EventStore } from './teamEventStore.js'

let eventStore: EventStore | undefined

export function getEventStore(): EventStore {
  if (!eventStore) {
    eventStore = process.env.TEAM_EVENT_SERVER_URL
      ? new RemoteEventStore(process.env.TEAM_EVENT_SERVER_URL)
      : new LocalFileEventStore()
  }
  return eventStore
}

export function setEventStore(store: EventStore): void {
  eventStore = store
}

export function getCoordinatorId(): string {
  return process.env.COORDINATOR_ID || hostname()
}
