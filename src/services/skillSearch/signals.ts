export type DiscoverySignal = {
  trigger: 'assistant_turn' | 'user_input'
  queryText: string
  startedAt: number
  durationMs: number
  indexSize: number
  method: 'tfidf'
}
