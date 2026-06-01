/**
 * OS keychain integration for LocalVault.
 *
 * On macOS this delegates to the system Keychain via security(1).
 * On Linux and other platforms, always throws KeychainUnavailableError
 * so LocalVault falls back to AES-256-GCM encrypted file storage
 * (~/.claude/local-vault.enc.json).
 */
export class KeychainUnavailableError extends Error {
  constructor() {
    super('OS keychain not available on this platform')
    this.name = 'KeychainUnavailableError'
  }
}

const unavailable = () => {
  throw new KeychainUnavailableError()
}

export const tryKeychain = {
  set: unavailable,
  get: unavailable,
  delete: unavailable,
  list: unavailable,
  _addToIndex: unavailable,
  _removeFromIndex: unavailable,
}
