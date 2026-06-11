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

### Telemetry: Source Preserved, Disabled by Default, Local Sink

Source code (Datadog / GrowthBook / BigQuery / 1P Event Logging) is preserved. All upstream reporting blocked via `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`. A local JSONL sink at `logEvent()` captures 70+ events to `~/.claude/local_analytics.jsonl`.

```bash
python3 scripts/analyze_analytics.py   # today's event report
tail -f ~/.claude/local_analytics.jsonl # real-time trace
```

→ [Claude Code's Light and Shadow: A Telemetry Deep-Dive](docs/Claude_Code_Light_and_Shadow.md)

### Personality Modes (`soul-distilled`)

`/mode` switches between 7 AI personalities — each with dedicated systemPrompt, UI theme, permissions, and response style:

| Mode | Icon | Description | Persona |
|------|:----:|-------------|:-------:|
| **Claude** | 🎭 | Authentic Claude persona — distilled from leaked 70KB Soul Document | 2,848 chars |
| Default | ⚡ | Balanced, everyday development | — |
| Gentle | 🌸 | Patient, educational | 231 chars |
| Dr. Sharp | 🔍 | Rigorous 3-step code review | 1,845 chars |
| Workhorse | 🐴 | Auto-execute, fewer confirmations | 203 chars |
| Token Saver | 💰 | Minimal replies, save tokens | 165 chars |
| Super AI | 🧠 | Deep thinking, comprehensive analysis | 266 chars |

```bash
/mode               # interactive picker
/mode claude        # switch directly to Claude persona
/mode sharp         # switch to code review mode
```

**Custom modes:** Drop a YAML file in `~/.claude/modes/` — auto-loaded alongside built-ins.

→ [CCP Claude Persona SWE-bench Lite Report (v2)](docs/ccp-claude-persona-swebench-report-v2-en.md) — cross-tool zero-migration. 90 instances: **+11pp** (68.6% vs 57.5%)

### Coordinator Event Log (`coordinator-sourced`)

Event sourcing for **compaction-resistant multi-agent communication**. Every coordinator action is written as a typed event before the next LLM turn — state lives outside the token window.

```
coordinator action → write event → compaction → fold events → checkpoint → restore
```

| Component | File | Purpose |
|-----------|------|---------|
| EventStore | `src/coordinator/teamEventStore.ts` | append / read / clear, 6 event types |
| TeamProjection | `src/coordinator/teamProjection.ts` | fold-based projection + checkpoint restore |
| LocalFileEventStore | `src/coordinator/teamEventStore.ts` | local JSONL (`.team-events/`) |
| RemoteEventStore | `src/coordinator/remoteEventStore.ts` | HTTP client, cross-machine |
| HTTP Server | `src/coordinator/eventHttpServer.ts` | Bun.serve:9742, zero deps |

**6 events:** `session_started` · `worker_spawned` · `worker_result` · `synthesis` · `decision` · `checkpoint`

```bash
# Machine A: serve events
TEAM_EVENT_SERVER_PORT=9742 bun run src/coordinator/eventHttpServerEntry.ts
# Machine B: read remotely
TEAM_EVENT_SERVER_URL=http://machine-a:9742 bun run dev
```

→ Design: [`EN`](docs/Coordinator_Event_Log_Design_Doc.md) · [`中文`](docs/Coordinator_Event_Log_设计文档.md) · [`Plan`](docs/plans/2026-06-11-coordinator-event-log.md)

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

### Related Documentation

- **DeepWiki**: [deepwiki.com/claude-code-best/claude-code](https://deepwiki.com/claude-code-best/claude-code)

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
