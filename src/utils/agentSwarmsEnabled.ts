import { isEnvTruthy } from './envUtils.js'

/**
 * Fork build: enabled by default. Can be disabled via
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS_DISABLED=1 if needed.
 */
export function isAgentSwarmsEnabled(): boolean {
  if (isEnvTruthy(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS_DISABLED)) {
    return false
  }

  return true
}
