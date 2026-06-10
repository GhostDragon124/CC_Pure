/**
 * UDS messaging utilities — Unix Domain Socket path management and server lifecycle.
 *
 * Each Claude Code instance creates a UDS socket for cross-session peer messaging.
 * Other instances discover peers by scanning for these sockets in a shared directory.
 *
 * Socket naming: claude-messaging-{hostname}-{pid}.sock
 * Hostname included to avoid PID collisions across containers / PID namespaces.
 */
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { existsSync, unlinkSync, chmodSync } from 'node:fs'

let activeSocketPath: string | null = null
let exitHandler: (() => void) | null = null

/** Default UDS socket path for this process — includes hostname to avoid PID namespace collisions. */
export function getDefaultUdsSocketPath(): string {
  return join(tmpdir(), `claude-messaging-${hostname()}-${process.pid}.sock`)
}

/** Get the currently active UDS messaging socket path, if any. */
export function getUdsMessagingSocketPath(): string | null {
  return activeSocketPath
}

/** Format a UDS path as a display address. */
export function formatUdsAddress(socketPath: string): string {
  return `uds:${socketPath}`
}

/**
 * Start the UDS messaging server on the given socket path.
 * Registers exit handler to clean up the socket file on process termination.
 */
export async function startUdsMessaging(
  socketPath: string,
  _options: { isExplicit: boolean },
): Promise<void> {
  // Clean up stale socket if present
  if (existsSync(socketPath)) {
    try {
      unlinkSync(socketPath)
    } catch {
      // Ignore — socket may be in use by another process
    }
  }

  // Guard against re-entry: only one messaging server per process
  if (activeSocketPath !== null) {
    throw new Error('UDS messaging already started')
  }

  return new Promise<void>((resolve, reject) => {
    const server = createServer(socket => {
      socket.on('data', () => {
        // Incoming peer message — handled by the inbox poller
      })
      socket.on('error', () => {
        // Peer disconnect — silently ignore
      })
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      // EADDRINUSE means another instance already holds this socket.
      // Do NOT claim success — we have no server listening. Reject so
      // the caller knows the socket is unavailable.
      reject(err)
    })

    server.listen(socketPath, () => {
      // Restrict to owner only — prevents other users from connecting
      try {
        chmodSync(socketPath, 0o600)
      } catch {
        /* best-effort */
      }

      activeSocketPath = socketPath

      // Clean up previous exit handler to prevent leak
      if (exitHandler) process.off('exit', exitHandler)
      exitHandler = () => {
        try {
          unlinkSync(socketPath)
        } catch {
          /* already gone */
        }
      }
      process.on('exit', exitHandler)

      resolve()
    })
  })
}
