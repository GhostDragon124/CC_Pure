import type { Dispatch, SetStateAction } from 'react'
import {
  oscColor,
  type TerminalQuerier,
} from '../core/terminal-querier.js'
import { setCachedSystemTheme, type SystemTheme } from '../theme/systemTheme.js'

const BACKGROUND_COLOR = 11
const POLL_INTERVAL_MS = 5_000

export function watchSystemTheme(
  querier: TerminalQuerier,
  setTheme: Dispatch<SetStateAction<SystemTheme>>,
): () => void {
  let cancelled = false

  async function poll(): Promise<void> {
    const [response] = await Promise.all([
      querier.send(oscColor(BACKGROUND_COLOR)),
      querier.flush(),
    ])
    if (cancelled || !response) return

    const theme = themeFromOscColor(response.data)
    if (!theme) return

    setCachedSystemTheme(theme)
    setTheme(theme)
  }

  void poll()
  const interval = setInterval(() => {
    void poll()
  }, POLL_INTERVAL_MS)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}

function themeFromOscColor(data: string): SystemTheme | undefined {
  const rgb = parseOscRgb(data)
  if (!rgb) return undefined

  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
  return luminance > 0.5 ? 'light' : 'dark'
}

type Rgb = {
  r: number
  g: number
  b: number
}

function parseOscRgb(data: string): Rgb | undefined {
  const rgbMatch =
    /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(data)
  if (rgbMatch) {
    return {
      r: hexComponent(rgbMatch[1]!),
      g: hexComponent(rgbMatch[2]!),
      b: hexComponent(rgbMatch[3]!),
    }
  }

  const hashMatch = /^#([0-9a-f]+)$/i.exec(data)
  if (hashMatch && hashMatch[1]!.length % 3 === 0) {
    const hex = hashMatch[1]!
    const width = hex.length / 3
    return {
      r: hexComponent(hex.slice(0, width)),
      g: hexComponent(hex.slice(width, 2 * width)),
      b: hexComponent(hex.slice(2 * width)),
    }
  }

  return undefined
}

function hexComponent(hex: string): number {
  const max = 16 ** hex.length - 1
  return parseInt(hex, 16) / max
}
