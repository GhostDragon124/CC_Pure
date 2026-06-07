// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Skill search signal types — used by skill search prefetch and attachment utilities.
// DiscoverySignal represents the signal emitted when a skill is discovered during prefetch.

export type DiscoverySignal = {
  type: 'skill_discovery'
  skillId: string
  [key: string]: unknown
}
