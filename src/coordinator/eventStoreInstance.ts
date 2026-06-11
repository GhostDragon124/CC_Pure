import { hostname } from 'os'
import { LocalFileEventStore, type EventStore } from './teamEventStore.js'

let eventStore: EventStore | undefined

export function getEventStore(): EventStore {
  eventStore ??= new LocalFileEventStore()
  return eventStore
}

export function setEventStore(store: EventStore): void {
  eventStore = store
}

export function getCoordinatorId(): string {
  return process.env.COORDINATOR_ID || hostname()
}
