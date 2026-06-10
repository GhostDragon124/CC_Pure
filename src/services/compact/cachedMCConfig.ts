/** Returns cached microcompact settings used by prompt construction. */
export function getCachedMCConfig() {
  return {
    enabled: process.env.CLAUDE_CACHED_MICROCOMPACT === '1',
    systemPromptSuggestSummaries: true,
    supportedModels: ['claude-sonnet-4', 'claude-opus-4', 'claude-haiku-4'],
    keepRecent: 5,
  }
}
