# Plan Only: Anthropic-Core `as any` Type Safety Improvement

## IMPORTANT
- **DO NOT execute any code changes. Produce a detailed plan ONLY.**
- Output your plan to `docs/plans/as-any-cleanup.md` in the repo.
- For each of the 94 `as any`, classify as: (FIXABLE with concrete type fix), (JUSTIFIED — explain why), or (NEEDS_UPSTREAM — requires CCB upstream context)

## Goal
Eliminate all fixable `as any` casts in Anthropic-original decompiled code, improving type safety and reducing technical debt. These are all decompilation artifacts — the original Anthropic TypeScript had proper types that were lost in decompilation.

## Scope
94 `as any` across ~60 files. EXCLUDED areas: API providers (openai/grok/gemini — JSON parsing), community commands (acp/autofix-pr/share/issue), generated types, test files, .d.ts stubs.

## Full List of `as any` by File

### src/main.tsx
1. L408: `(global as any).require('inspector')`

### src/hooks/
2. useIdeSelection.ts L113: `SelectionChangedSchema() as any`
3. useVirtualScroll.ts L186: comment only (not actual as any)
4. toolPermission/PermissionContext.ts L228: `suggestions as any`
5. useIdeLogging.ts L30: `LogEventSchema() as any`
6. usePromptsFromClaudeInChrome.tsx L51: `ClaudeInChromePromptNotificationSchema() as any`

### src/components/
7. FeedbackSurvey/useFrustrationDetection.ts L15: `(m as any).isApiErrorMessage`
8. FeedbackSurvey/useFrustrationDetection.ts L28: `isPolicyAllowed('product_feedback' as any)`
9. ultraplan/UltraplanChoiceDialog.tsx L97: `(key as any).wheelDown`
10. ultraplan/UltraplanChoiceDialog.tsx L98: `(key as any).wheelDown`
11. ultraplan/UltraplanChoiceDialog.tsx L100: `(key as any).wheelUp`
12. ultraplan/UltraplanChoiceDialog.tsx L101: `(key as any).wheelUp`
13. PromptInput/PromptInput.tsx L1802: `mode: previousModeBeforeAuto as any`
14. PromptInput/PromptInput.tsx L1808: `mode: previousModeBeforeAuto as any`
15. messages/AttachmentMessage.tsx L146: `attachment as any`
16. messages/UserTextMessage.tsx L106: `UserGitHubWebhookMessage as any`
17. messages/UserTextMessage.tsx L160: `UserForkBoilerplateMessage as any`
18. messages/UserTextMessage.tsx L173: `UserCrossSessionMessage as any`
19. ConsoleOAuthFlow.tsx L275: `{ modelType: 'anthropic' } as any`
20. ConsoleOAuthFlow.tsx L680: `modelType: 'anthropic' as any`
21. ConsoleOAuthFlow.tsx L682: `} as any`
22. ConsoleOAuthFlow.tsx L900: `modelType: 'openai' as any`
23. ConsoleOAuthFlow.tsx L902: `} as any`
24. ConsoleOAuthFlow.tsx L1133: `modelType: 'gemini' as any`
25. ConsoleOAuthFlow.tsx L1135: `} as any`
26. permissions/PermissionRequest.tsx L106: `(MonitorPermissionRequest ?? FallbackPermissionRequest) as any`

### src/utils/
27. sideQuery.ts L224: `client.chat.completions.create(requestParams as any, ...)`
28. execFileNoThrowPortable.ts L75: `(execaSync as any)(command, ...)`
29. ultraplan/ccrSession.ts L104: `(m as any).message.content`
30. ultraplan/ccrSession.ts L112: `(m as any).message.content`
31. transcriptSearch.ts L100: `(p as any[])`
32. filePersistence/outputsScanner.ts L72: `}) as any[]`
33. filePersistence/outputsScanner.ts L116: `(turnStartTime as any as number)`
34. performanceShim.ts L140: `markResourceTiming: (() => {}) as any`
35. performanceShim.ts L146: `(original as any).onresourcetimingbufferfull`
36. performanceShim.ts L162: `(globalThis as any).__performanceShimInstalled`
37. performanceShim.ts L163: `(globalThis as any).__performanceShimInstalled = true`
38. settings/validateEditTool.ts L39: `(afterValidation as any).error`
39. log.ts L233: `(await readdir(...)) as any`
40. hooks/execAgentHook.ts L214: `(message as any).attachment.type`
41. hooks/execAgentHook.ts L216: `(message as any).attachment.data`
42. computerUse/escHotkey.ts L29: `(cu as any).hotkey?.registerEscape`
43. computerUse/escHotkey.ts L44: `(requireComputerUseSwift() as any).hotkey?.unregister()`
44. computerUse/escHotkey.ts L54: `(requireComputerUseSwift() as any).hotkey?.notifyExpectedEscape()`
45. computerUse/hostAdapter.ts L83: `(cu as any).tcc`
46. computerUse/executorCrossPlatform.ts L494: `(this as any).mouseDown()`
47. computerUse/executorCrossPlatform.ts L499: `(this as any).mouseUp()`
48. computerUse/executorCrossPlatform.ts L556: `windowManagement.manageWindow(action as any, opts)`
49. computerUse/win32/bridgeClient.ts L136: `(writable as any).flush`
50. computerUse/win32/bridgeClient.ts L137: `(writable as any).flush()`
51. computerUse/drainRunLoop.ts L21: `(cu as any)?._drainMainRunLoop?.()`
52. computerUse/common.ts L57: `: 'none') as any`
53. computerUse/common.ts L62: `: 'darwin') as any`
54. messageQueueManager.ts L371: `(cmd as any).origin?.kind === 'channel'`
55. plugins/marketplaceManager.ts L191: `} as any`
56. forkedAgent.ts L565: `(message as any).event?.type === 'message_delta'`
57. forkedAgent.ts L566: `(message as any).event.usage`
58. forkedAgent.ts L568: `(message as any).event.usage`
59. deepLink/protocolHandler.ts L97: `(waitForUrlEvent as any)(5000)`
60. sliceAnsi.ts L80: `(token as any).value`
61. plans.ts L370: `(snapshotFiles as any[])`
62. plans.ts L377: `(snapshotFiles as any[])`
63. textHighlighting.ts L131: `(token as any).value.length`
64. textHighlighting.ts L138: `(token as any).value.length`
65. sideQuestion.ts L139: `(toolUse as any).name`
66. sideQuestion.ts L151: `formatAPIError(apiErr.error as any)`
67. messages.ts L3894: `attachment as any`
68. searchExtraTools.ts L507: `(msg as any).compactMetadata?.preCompactDiscoveredTools`
69. effort.ts L81: `get3PModelCapabilityOverride(_model, 'xhigh_effort' as any)`
70. sessionRestore.ts L81: `(msg.message!.content as any[])`
71. worktree.ts L1296: `(result as any).baseBranch`
72. permissions/permissions.ts L416: `suggestions as any`
73. permissions/permissions.ts L427: `decision.updatedPermissions as any`
74. permissions/permissions.ts L432: `decision.updatedPermissions as any`
75. auth.ts L120: `(settings as any).modelType === 'openai'`
76. auth.ts L121: `(settings as any).modelType === 'gemini'`
77. swarm/inProcessRunner.ts L1452: `(m.message?.content ?? []) as any[]`

### src/constants/
78. promptEngineeringAudit.runner.ts L15: `(globalThis as any).MACRO = {`
79. promptEngineeringAudit.runner.ts L217: `] as any`
80. outputStyles.ts L188: `(style as any).source === 'plugin'`
81. outputStyles.ts L189: `(style as any).forceForPlugin === true`

### src/services/
82. vcr.ts L272: `.filter(Boolean) as any`
83. tokenEstimation.ts L482: `block.content as any`
84. skillSearch/prefetch.ts L244: `} as any`
85. skillSearch/prefetch.ts L309: `} as any`
86. notifier.ts L139: `plist.parse(defaultsOutput.stdout) as any`

### src/tasks/
87. LocalShellTask/killShellTasks.ts L18: `(task as any).status !== 'running'`

### src/buddy/
88. companionReact.ts L76: `(m as any).message?.content`
89. companionReact.ts L92: `(m as any).message?.content`

### src/entrypoints/
90. mcp.ts L147: `(validationResult as any).message`
91. cli.tsx L13: `(globalThis as any).MACRO = {`
92. cli.tsx L149: `ChannelPermissionRequestNotificationSchema() as any`

### packages/builtin-tools/src/tools/
93. FileReadTool/FileReadTool.ts L913,917,984,1000,1177 (5 total): `(extractResult as any)`, `(sharp as any)`
94. AgentTool/runAgent.ts L789-808 (5 total): `(message as any).event`, `(message as any).ttftMs`, etc.

## Categories for Analysis

For each occurrence, classify and recommend:

A. **Zod schemas** (2,5,6,92): `SomeSchema() as any` — schema type inference lost
B. **Message/attachment access** (7,29-31,40-41,56-58,67-68,70,77,88-89): accessing sub-properties not in SDKMessage type
C. **globalThis/global MACRO** (1,13-14,36-37,78,91): dev-mode constants injected at build time
D. **ComputerUse dynamic modules** (42-53): optional native module feature detection
E. **ConsoleOAuthFlow config** (19-25): settings update type mismatches
F. **Theme/permission/config** (4,72-74,75-76,80-81): style/permission type extensions
G. **CLI key handlers** (9-12): non-standard KeyboardEvent properties
H. **Performance polyfill** (34-37): Bun lacks browser performance API
I. **Dynamic function calls** (27-28,59): execaSync, openai client calls, dynamic imports
J. **Misc runtime access** (3,8,15-18,26,32-33,38-39,54-55,60-66,69,71,79,82-87,90,93-94)

## Verification
After plan is complete, verify by running:
```bash
export PATH="$HOME/.bun/bin:$PATH"
bun run typecheck  # should still have 20 errors (community code, unchanged)
```
