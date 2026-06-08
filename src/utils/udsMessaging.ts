// Stub — UDS messaging utilities. CC_Pure keeps core remote-control.
// Full UDS mesh is disabled; these stubs satisfy the typechecker.

export const startUdsMessaging: (
  socketPath: string,
  options: { isExplicit: boolean },
) => Promise<void> = async () => {}
export const getDefaultUdsSocketPath: () => string = () => ''

/** Get the UDS messaging socket path for the current peer. */
export function getUdsMessagingSocketPath(): string {
  return ''
}

/** Format a UDS address for display. */
export function formatUdsAddress(_socketPath: string): string {
  return ''
}
