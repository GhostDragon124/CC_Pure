// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Cached model configuration (MC) config utilities.
// Used by prompts.ts to read cached MC settings including summary suggestions.
// Stub: returns empty config.

export const getCachedMCConfig: () => {
  enabled?: boolean
  systemPromptSuggestSummaries?: boolean
  supportedModels?: string[]
  [key: string]: unknown
} = () => ({})
