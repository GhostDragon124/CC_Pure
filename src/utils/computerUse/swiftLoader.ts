import type { ComputerUseAPI } from '@ant/computer-use-swift'

export type ComputerUseSwiftAPI = ComputerUseAPI & {
  hotkey?: {
    registerEscape(onEscape: () => void): boolean
    unregister(): void
    notifyExpectedEscape(): void
  }
  tcc?: {
    checkAccessibility(): boolean
    checkScreenRecording(): boolean
  }
  _drainMainRunLoop?: () => void
}

let cached: ComputerUseSwiftAPI | undefined

/**
 * macOS-only loader for @ant/computer-use-swift.
 * Non-darwin platforms should use src/utils/computerUse/platforms/ instead.
 */
export function requireComputerUseSwift(): ComputerUseSwiftAPI {
  if (cached) return cached
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@ant/computer-use-swift')
  if (mod.ComputerUseAPI && typeof mod.ComputerUseAPI === 'function') {
    cached = new mod.ComputerUseAPI() as ComputerUseSwiftAPI
  } else {
    cached = mod as ComputerUseSwiftAPI
  }
  return cached
}

export type { ComputerUseAPI }
