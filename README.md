<div align="right">
  <a href="./README_CN.md">中文</a>
</div>

# CC Pure — Claude Code Study Edition

[![Bun](https://img.shields.io/badge/runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-3986-brightgreen?style=flat-square)]()
[![CodeQL](https://img.shields.io/badge/CodeQL-0%20open%20%C2%B7%2047%20risk%20accepted-yellow?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/tsc-0%20errors-brightgreen?style=flat-square)]()
[![Download](https://img.shields.io/badge/download-latest-blue?style=flat-square)](https://github.com/James-FE/CC_Pure/releases/latest)

> A clean, independently-maintained study edition. **Telemetry removed. Types fixed. Core capabilities preserved.**
>
> **Current (2026-06):** Personality system · Coordinator SQLite blackboard · 0 tsc errors · 0 CodeQL

---

## ⚡ Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.11

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install

```bash
# Option 1: Pre-built (no build required — macOS & Linux)
curl -L https://github.com/James-FE/CC_Pure/releases/latest/download/ccp-v2.6.11.tar.gz | tar xz
cd dist-nosplit && bun cli.js --version

# Option 2: Build from source
git clone https://github.com/James-FE/CC_Pure.git
cd CC_Pure
bun install
bun run build
```

### Configure API

```bash
# DeepSeek (OpenAI-compatible) — one-time setup, CCP reads it automatically
mkdir -p ~/.ccp
cat > ~/.ccp/settings.json << 'EOF'
{"modelType":"openai","env":{"OPENAI_BASE_URL":"https://api.deepseek.com/v1","OPENAI_API_KEY":"sk-your-key"}}
EOF

# Or use environment variables for any provider:
# export OPENAI_BASE_URL="https://api.deepseek.com/v1"
# export OPENAI_API_KEY="sk-xxx"
# export ANTHROPIC_BASE_URL="https://api.anthropic.com/v1"
# export ANTHROPIC_API_KEY="sk-ant-xxx"
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

### 🤝 Communication System — Structured Blackboard (`blackboard-sourced`)

> **Peer module to Personality system.** The multi-agent communication layer — faster, simpler, and less error-prone than Anthropic's original event sourcing.
>
> Full design doc: [`黑板书通信系统设计文档`](docs/communication-system-design.md) (Chinese) | [Evolution log](docs/from-event-sourcing-to-unified-blackboard.md)

SQLite-backed blackboard with **structured key naming** for compaction-resistant multi-agent coordination. Every state mutation is recorded as both an audit event and a key-value entry in a single transaction — workers write, coordinator reads, janitor cleans.

```
worker writes → recordEvent() → [events + kv in single SQLite tx]
coordinator reads → latest state by key → janitor reaps stale entries
```

| Component | File | Purpose |
|-----------|------|---------|
| BlackboardStore | `src/blackboard/BlackboardStore.ts` | SQLite CRUD: upsert, prefix query, CAS |
| KvHelpers | `src/blackboard/kvHelpers.ts` | Structured key builders (`workerKey()`) + parsers (`parseWorkerKey()`) |
| BlackboardJanitor | `src/blackboard/BlackboardJanitor.ts` | Rule engine: reaps expired keys, cleans orphans, monitors heartbeats |
| eventRecorder | `src/blackboard/eventRecorder.ts` | `recordEvent()` — single transaction writes both `events` and `kv` tables |
| RemoteEventStore | `src/coordinator/remoteEventStore.ts` | HTTP client, cross-machine (Phase 2) |
| HTTP Server | `src/coordinator/eventHttpServer.ts` | Bun.serve:9742, zero deps |

**Key convention:** `worker:N:status`, `worker:N:result`, `team:sources`, `coordinator:decision`

**Deprecated:** `teamEventStore.ts` (JSONL event log) and `teamProjection.ts` (fold logic) — preserved in `persist/coordinator-event-sourcing` branch for reference.

```bash
# Run coordinator mode with blackboard
CLAUDE_CODE_USE_OPENAI=1 bun run dev -- --coordinator
```

→ Design: [`EN`](docs/Coordinator_Event_Log_Design_Doc.md) · [`中文`](docs/Coordinator_Event_Log_设计文档.md) · [`Plan`](docs/plans/2026-06-11-coordinator-event-log.md)

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

---

## Engineering Quality

| Metric | CCB Baseline | CC Pure | Improvement |
|--------|:------------:|:-------:|:-----------:|
| tsc errors | 62 | **0** | All decompilation artifacts cleared |
| Tests passing | 3,007 | **3,986** | +979 |
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

- [James-FE](https://github.com/James-FE) — Maintainer
- [Claude Code Best](https://github.com/claude-code-best/claude-code) — Reverse engineering & open-source foundation
- [Anthropic](https://www.anthropic.com/) — Original author of Claude Code
