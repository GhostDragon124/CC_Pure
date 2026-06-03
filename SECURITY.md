# Security Policy

CC_Pure is a reverse-engineered research fork of Claude Code CLI. Security issues are
taken seriously, especially those involving credential leakage, remote attack surface,
command injection, and unsafe defaults.

## Supported Versions

Only the `main` branch receives security updates. No release tags are maintained.

## Reporting a Vulnerability

**Do NOT open a public issue.** Instead, report vulnerabilities privately:

- GitHub: [Security Advisories](https://github.com/GhostDragon124/CC_Pure/security/advisories/new)
- Expect acknowledgment within 72 hours and a status update within 7 days.

## Scope

| Area | Status |
|------|--------|
| Credential redaction in logs | Addressed (#38-40) |
| Remote control default bind (0.0.0.0 → 127.0.0.1) | Addressed (#64) |
| Shell injection via headersHelper | Addressed (#36) |
| URL substring validation bypass | Addressed (#41-43) |
| HTML stripping fragility | Addressed (#18-24) |
| BashTool shell execution | **By design** — BashTool's job is to run shell commands. Do not report shell metacharacter usage as a vulnerability. |
| Decompilation artifacts (unused variables, dead code) | Out of scope — these are expected in reverse-engineered code. |
| Docker sandbox escape (`bwrap`) | In scope — report via advisory. |

## CodeQL

Code scanning runs on every push to `main` via `codeql.yml` (security-extended suite).
Quality-only rules are dismissed as decompilation artifacts. Security alerts are
triaged and addressed per the above scope.
