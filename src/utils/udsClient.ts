// Stub — UDS client for peer discovery. CC_Pure keeps core remote-control.
// Full UDS mesh is disabled; these stubs satisfy the typechecker.

export interface PeerInfo {
  peerId: string
  socketPath: string
  messagingSocketPath?: string
  name?: string
  kind?: string
  cwd?: string
  pid?: number
  sessionId?: string
}

export interface LiveSession {
  kind: string
  sessionId: string
}

/** List connected peers on the UDS mesh. */
export async function listPeers(): Promise<PeerInfo[]> {
  return []
}

/** Send a message to a UDS socket. CC_Pure: not implemented. */
export async function sendToUdsSocket(
  _socketPath: string,
  _message: unknown,
): Promise<void> {
  throw new Error('sendToUdsSocket: not available in CC_Pure')
}

/** List all live sessions via UDS. CC_Pure: not implemented. */
export async function listAllLiveSessions(): Promise<LiveSession[]> {
  return []
}
