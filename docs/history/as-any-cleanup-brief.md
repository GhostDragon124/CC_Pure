# `as any` Cleanup — Anthropic Decompilation Artifacts

## Scope
94 `as any` in Anthropic-original code (excluding API adapters, community code, generated types, test files, and .d.ts).

## Categories (for prioritization)

### A. Zod schema `.safeParse()` / `.parse()` — schema types lost in decompilation
Files: useIdeSelection.ts, useIdeLogging.ts, usePromptsFromClaudeInChrome.tsx, mcp.ts, cli.tsx, execAgentHook.ts
Pattern: `SomeSchema() as any` — the Zod schema type isn't inferred properly
Fix: Declare typed wrapper or use `z.input<>` / `z.infer<>`

### B. Message/attachment content access
Files: forkedAgent.ts, ccrSession.ts, companionReact.ts, messages.ts, sessionRestore.ts, searchExtraTools.ts, transcriptSearch.ts
Pattern: `(m as any).message.content`, `(m as any).event.type` — SDKMessage indexer doesn't cover these paths
Fix: Extend SDKMessage type to include known sub-properties

### C. `globalThis / global as any`
Files: main.tsx, performanceShim.ts, promptEngineeringAudit.runner.ts, cli.tsx
Pattern: `(globalThis as any).MACRO = ...`, `(global as any).require('inspector')`
Fix: Declare global types

### D. ComputerUse runtime feature detection
Files: escHotkey.ts, hostAdapter.ts, executorCrossPlatform.ts, drainRunLoop.ts, common.ts
Pattern: `(cu as any).hotkey`, `(requireComputerUseSwift() as any)` — optional native modules
Fix: Declare proper interfaces for optional modules

### E. ConsoleOAuthFlow config objects
File: ConsoleOAuthFlow.tsx (7)
Pattern: `{ modelType: 'anthropic' } as any`, `updateSettingsForSource(...) as any`
Fix: Type the settings update functions properly

### F. Theme/permission/config objects
Files: PermissionRequest.tsx, permissions.ts, auth.ts, outputStyles.ts
Pattern: `theme.permission as any`, `suggestions as any`, `style as any`
Fix: Extend existing type interfaces

### G. CLI/TUI key handlers
File: ultraplan/UltraplanChoiceDialog.tsx (4)
Pattern: `(key as any).wheelDown` — non-standard key properties
Fix: Extend Key type or use type guard

### H. Performance polyfill/shim
File: performanceShim.ts (4)
Pattern: Mocking browser performance API for server runtime
Fix: Probably unfixable — Bun doesn't have these APIs

### I. Dynamic imports / require() / execaSync
Files: main.tsx, execFileNoThrowPortable.ts, sideQuery.ts, notifier.ts
Pattern: `(execaSync as any)(...)`, `client.chat.completions.create(requestParams as any, ...)`
Fix: May need proper type imports or declarations

### J. Miscellaneous
Files: worktree.ts, drainRunLoop.ts, messageQueueManager.ts, deepLink, sliceAnsi, plans, textHighlighting, stats, etc.
Various patterns — each needs individual assessment

## Instructions for Codex
1. Read each file and determine if `as any` is: (a) fixable with proper types, (b) justified (runtime feature detection, performance polyfill, etc.), or (c) needs more upstream context
2. Propose priority order (fixable first)
3. For each fixable case, write the specific type declaration or code change
4. Output a markdown plan to docs/plans/as-any-cleanup.md
5. Do NOT execute — plan only
