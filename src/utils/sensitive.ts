const REDACTED = '[REDACTED]'

const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|auth(?:orization)?|bearer|cookie|credential|password|secret|session|token)/i

const SENSITIVE_QUERY_PARAMS = new Set([
  'access_token',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'client_secret',
  'code',
  'credential',
  'key',
  'password',
  'refresh_token',
  'secret',
  'session',
  'token',
])

const TOKEN_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk-ant-[A-Za-z0-9_-]{10,})\b/g, REDACTED],
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, REDACTED],
  [/\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{10,}\b/g, REDACTED],
  [/\bnpm_[A-Za-z0-9]{36}\b/g, REDACTED],
  [/\bxox[baporst]-[A-Za-z0-9-]{10,}\b/g, REDACTED],
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi, `Bearer ${REDACTED}`],
  [/\bBasic\s+[A-Za-z0-9+/]+=*\b/gi, `Basic ${REDACTED}`],
]

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

export function redactUrl(urlString: string): string {
  try {
    const parsed = new URL(urlString)
    if (parsed.username) parsed.username = REDACTED
    if (parsed.password) parsed.password = REDACTED

    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED)
      }
    }

    return redactForLog(parsed.toString())
  } catch {
    return redactForLog(urlString)
  }
}

export function redactValue(key: string, value: unknown): string
export function redactValue(value: unknown): string
export function redactValue(keyOrValue: unknown, value?: unknown): string {
  if (arguments.length > 1) {
    const key = String(keyOrValue)
    return isSensitiveKey(key) ? REDACTED : redactForLog(String(value ?? ''))
  }

  return redactForLog(String(keyOrValue ?? ''))
}

export function redactForLog(message: unknown): string {
  let redacted = String(message ?? '')

  for (const [pattern, replacement] of TOKEN_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }

  redacted = redacted.replace(
    /\b([A-Za-z0-9_.-]*(?:api[_-]?key|auth|authorization|bearer|cookie|credential|password|secret|session|token)[A-Za-z0-9_.-]*)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi,
    (_match, key: string) => `${key}=${REDACTED}`,
  )

  return redacted
}

/**
 * Strip CR/LF from a log argument to prevent log-injection attacks.
 * CodeQL's js/log-injection query flags console.log/error calls that pass
 * untrusted data; this sanitizer breaks the injection path by removing
 * carriage-return and line-feed characters before they reach the log sink.
 */
export function sanitizeLog(arg: unknown): string {
  const s = typeof arg === 'string' ? arg : String(arg)
  return s.replace(/[\r\n]/g, '↵')
}
