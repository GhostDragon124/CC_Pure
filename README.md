<div align="right">
  <a href="./README_CN.md">中文</a>
</div>

# CC Pure — A Clean Fork of Claude Code

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3968-brightgreen?style=flat-square)]()
[![CodeQL](https://img.shields.io/badge/CodeQL-0%20open%20%C2%B7%2047%20risk%20accepted-yellow?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/tsc-0%20errors-brightgreen?style=flat-square)]()

> A clean, independently-maintained fork of Claude Code. **Telemetry removed. Types fixed. Core capabilities preserved.**
>
> **Current (2026-06):** Personality system + 0 tsc errors + 0 CodeQL + Coordinator event sourcing

---

## ⚡ Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.11

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install

```bash
git clone https://github.com/GhostDragon124/CC_Pure.git
cd CC_Pure
bun install
bun run build          # builds to dist/ (split build, ~586 files)
```

### Configure API

```bash
# Option 1: Environment variables
export ANTHROPIC_BASE_URL="https://your-api/v1"
export ANTHROPIC_API_KEY="sk-xxx"

# Option 2: /login command in REPL
bun run dev
```

### Verify

```bash
ccp --version           # → 2.6.11 (Claude Code)
ccp -p "1+1"            # → 2
```

---

## Relationship with Upstream

CC Pure is based on decompiled CCB v2.6.11 sources with these key changes:

### What Was Removed / Downgraded

| Component | Status | Notes |
|-----------|:------:|-------|
| Sentry error tracking | ❌ Removed | Third-party data upload |
| Anthropic telemetry | ❌ Blocked | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` |
| Langfuse monitoring | 🟡 Dormant | Code preserved (`src/services/langfuse/`), activates with keys |
| GrowthBook remote config | 🟡 Local fallback | 1,256-line client, auto-falls-back to local defaults |

### What Was Preserved

| Category | Feature | Status |
|----------|---------|:------:|
| **Agent Protocol** | ACP (external agent bridge/session/permissions) | ✅ |
| **Browser** | Chrome Use + Computer Use (GUI automation) | ✅ |
| **Remote Control** | BRIDGE_MODE (React Web UI + WebSocket/SSE) | ✅ |
| | SSH_REMOTE (2,029-line full implementation) | ✅ |
| **Autonomy** | PROACTIVE + DAEMON + COORDINATOR_MODE | ✅ |
| | BG_SESSIONS (ps/logs/attach/kill) | ✅ |
| **Memory** | EXTRACT_MEMORIES + LODESTONE + AWAY_SUMMARY | ✅ |
| **Reasoning** | ULTRATHINK + ULTRAPLAN + VERIFICATION_AGENT | ✅ |
| **Tools** | TOKEN_BUDGET + PROMPT_CACHE_BREAK_DETECTION | ✅ |
| **Voice** | VOICE_MODE | 🟡 Code complete, needs Anthropic OAuth |
| **Scheduling** | KAIROS / KAIROS_BRIEF | 🟡 Code complete, needs GrowthBook + OAuth backend |

### Personality Modes (`soul-distilled`)

`/mode` switches between 7 AI personalities — each with dedicated systemPrompt, UI theme, permissions, and response style:

| Mode | Icon | Description |
|------|:----:|-------------|
| **Claude** | 🎭 | Authentic Claude persona — distilled from leaked 70KB Soul Document |
| Default | ⚡ | Balanced, everyday development |
| Gentle | 🌸 | Patient, educational |
| Dr. Sharp | 🔍 | Rigorous 3-step code review |
| Workhorse | 🐴 | Auto-execute, fewer confirmations |
| Token Saver | 💰 | Minimal replies, save tokens |
| Super AI | 🧠 | Deep thinking, comprehensive analysis |

### Coordinator Event Log (`coordinator-sourced`)

Event sourcing architecture for **compaction-resistant multi-agent communication**. When coordinator orchestrates multiple workers, every action is written as a typed event before the next LLM turn — compaction can't evict shared state because state lives in an append-only store outside the token window.

```
coordinator action → write event → later: compaction → fold events → checkpoint → restore
```

| Component | File | Purpose |
|-----------|------|---------|
| EventStore | `src/coordinator/teamEventStore.ts` | Interface: append / read / clear, 6 event types |
| TeamProjection | `src/coordinator/teamProjection.ts` | Fold-based projection + checkpoint snapshot restore |
| LocalFileEventStore | `src/coordinator/teamEventStore.ts` | Local JSONL storage under `.team-events/` |
| RemoteEventStore | `src/coordinator/remoteEventStore.ts` | HTTP client for cross-machine (GET/POST/DELETE) |
| HTTP Server | `src/coordinator/eventHttpServer.ts` | Bun.serve on port 9742, zero external deps |

**6 event types:** `session_started`, `worker_spawned`, `worker_result`, `synthesis`, `decision`, `checkpoint`

**Cross-machine deployment:**

```bash
# Machine A: start event server
TEAM_EVENT_SERVER_PORT=9742 bun run src/coordinator/eventHttpServerEntry.ts

# Machine B: read machine A's worker state remotely
TEAM_EVENT_SERVER_URL=http://machine-a:9742 bun run dev
```

→ Full design: [`Coordinator_Event_Log_Design_Doc.md`](docs/Coordinator_Event_Log_Design_Doc.md) (EN) · [`设计文档`](docs/Coordinator_Event_Log_设计文档.md) (中文) · [`Implementation plan`](docs/plans/2026-06-11-coordinator-event-log.md)

---

## Engineering Quality

| Metric | CCB Baseline | CC Pure | Improvement |
|--------|:------------:|:-------:|:-----------:|
| tsc errors | 62 | **0** | All decompilation artifacts cleared |
| Tests passing | 3,007 | **3,968** | +961 |
| Build | Unstable | **Stable (splitting: true)** | ✅ |
| Telemetry egress | Yes | **0** | ✅ |
| CodeQL open | 175+ | **0** | 254 fixed · 260 dismissed |
| `as any` (core) | 94 | **0** | ✅ |

---

## ⚠️ Disclaimer

1. **Research and educational use only.** All rights to Claude Code belong to [Anthropic](https://www.anthropic.com/).
2. **Not an official CCB release.** CC Pure is a personally-maintained clean fork, not reviewed or endorsed by the CCB team.
3. **No warranty.** Use this software at your own risk.
4. **API compliance.** Using third-party APIs requires compliance with the respective provider's terms. This project does not provide any API keys.

---

## Acknowledgements

- [GhostDragon124](https://github.com/GhostDragon124) — Maintainer
- [Claude Code Best](https://github.com/claude-code-best/claude-code) — Reverse engineering & open-source foundation
- [Anthropic](https://www.anthropic.com/) — Original author of Claude Code
