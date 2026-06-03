/**
 * Local analytics sink — writes events to a JSONL file on disk.
 *
 * This runs IN PARALLEL with the upstream Datadog/1P sinks (if enabled).
 * Events are appended immediately; timestamps are added by the writer.
 *
 * Output: ~/.claude/local_analytics.jsonl
 * Format: one JSON object per line, fields: { ts, event, ...metadata }
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const LOCAL_ANALYTICS_DIR = path.join(os.homedir(), '.claude')
const LOCAL_ANALYTICS_FILE = path.join(LOCAL_ANALYTICS_DIR, 'local_analytics.jsonl')

// Ensure the directory exists on first write
let dirEnsured = false

function ensureDir(): void {
  if (!dirEnsured) {
    fs.mkdirSync(LOCAL_ANALYTICS_DIR, { recursive: true })
    dirEnsured = true
  }
}

/**
 * Write a single analytics event to the local JSONL file.
 * Non-blocking sync write — JSONL appends are fast enough for analytics volume.
 */
export function writeLocalEvent(
  eventName: string,
  metadata: Record<string, unknown>,
): void {
  try {
    ensureDir()
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: eventName,
      ...metadata,
    }) + '\n'
    fs.appendFileSync(LOCAL_ANALYTICS_FILE, line, 'utf-8')
  } catch {
    // Silently ignore write failures — analytics must never crash the app
  }
}

/**
 * Return the path to the local analytics file for external analysis tools.
 */
export function getLocalAnalyticsPath(): string {
  return LOCAL_ANALYTICS_FILE
}
