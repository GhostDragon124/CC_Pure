# `as any` Cleanup Implementation Plan

> Scope note: this plan is based on `.hermes/plans/as-any-cleanup-task.md` and targeted reads of the surrounding five lines for the listed `.ts`/`.tsx` source files under `src/` and `packages/`. No source files were edited and no builds were run while preparing this plan.

**Goal:** Remove fixable `as any` casts from Anthropic-core decompiled TypeScript while preserving runtime behavior.

**Architecture:** Prefer restoring lost discriminated unions, local type guards, and precise wrapper interfaces at the smallest owning boundary. Use `unknown`, `satisfies`, module/global augmentation, and existing domain types instead of `any`. Cases that represent missing CCB/upstream message or SDK schema contracts are marked `NEEDS_UPSTREAM`.

**Tech Stack:** TypeScript, React/Ink, MCP SDK schemas, Node/Bun APIs, native computer-use modules.

---

## Execution Rules

- Do not edit generated files, test files, community command areas, provider JSON parsing paths, `node_modules`, `dist`, or lockfiles.
- For each fix, run a targeted typecheck only after source edits are made in a later implementation pass.
- Preserve behavior first. Most replacements should be type-only changes, type guards, or changed declaration shapes.
- When a cast is retained for runtime dynamism, replace `as any` with a documented `unknown`-based interface or mark as `NEEDS_UPSTREAM`.

## Recommended Task Order

1. Add shared narrow types for globals, MCP notification schemas, message extensions, permission updates, and native computer-use modules.
2. Replace straightforward local casts with type guards or reordered narrowing.
3. Fix setting/config shape casts by extending the owning config types once.
4. Fix message/attachment access by adding explicit unions or guards near message type definitions.
5. Handle native/dynamic modules with typed optional capability interfaces.
6. Re-run `rg -n "as any" src packages --glob '*.ts' --glob '*.tsx' --glob '!*.d.ts'` and confirm only intentionally excluded areas remain.
7. Run the task's deferred verification command:

```bash
export PATH="$HOME/.bun/bin:$PATH"
bun run typecheck
```

Expected per the task: typecheck still reports the existing unrelated community-code errors unless those have been fixed separately.

## Inventory And Fix Plan

| # | Location | Classification | Fix |
|---|---|---|---|
| 1 | `src/main.tsx:408` `(global as any).require('inspector')` | FIXABLE | Import `createRequire` from `node:module`, create `const require = createRequire(import.meta.url)`, then load `node:inspector` as `typeof import('node:inspector')`. |
| 2 | `src/hooks/useIdeSelection.ts:113` `SelectionChangedSchema() as any` | NEEDS_UPSTREAM | Restore the MCP SDK notification schema type returned by `SelectionChangedSchema`; once the schema factory is typed as the SDK handler parameter type, remove the cast. |
| 3 | `src/hooks/useVirtualScroll.ts:186` comment-only `as any` | JUSTIFIED | No code cast exists. Optional grep-cleanup fix: reword the comment to "as suitable as any other range" so literal searches do not count it. |
| 4 | `src/hooks/toolPermission/PermissionContext.ts:228` `suggestions as any` | FIXABLE | Align `suggestions` with the hook runner parameter type, likely `PermissionSuggestion[]`; update the `runPermissionRequestHooks` signature if it currently expects a looser decompiled type. |
| 5 | `src/hooks/useIdeLogging.ts:30` `LogEventSchema() as any` | NEEDS_UPSTREAM | Restore the MCP notification schema factory type for IDE log events; remove the cast once `setNotificationHandler` accepts the returned schema type directly. |
| 6 | `src/hooks/usePromptsFromClaudeInChrome.tsx:51` `ClaudeInChromePromptNotificationSchema() as any` | NEEDS_UPSTREAM | Restore the MCP notification schema factory type for Chrome prompt notifications; keep notification params inferred from the schema. |
| 7 | `src/components/FeedbackSurvey/useFrustrationDetection.ts:15` `(m as any).isApiErrorMessage` | FIXABLE | Replace with a type guard, for example `isApiErrorFeedbackMessage(m): m is Message & { isApiErrorMessage: true }`, or use the canonical system API-error message discriminant if available. |
| 8 | `src/components/FeedbackSurvey/useFrustrationDetection.ts:28` `'product_feedback' as any` | FIXABLE | Add `'product_feedback'` to the policy key union consumed by `isPolicyAllowed`, or introduce a typed `PolicyKey.ProductFeedback` constant. |
| 9 | `src/components/ultraplan/UltraplanChoiceDialog.tsx:97` `(key as any).wheelDown` | FIXABLE | Define `type WheelKey = typeof key & { wheelDown?: boolean; wheelUp?: boolean }` once inside the handler and read `const wheelKey = key as WheelKey`. |
| 10 | `src/components/ultraplan/UltraplanChoiceDialog.tsx:98` `(key as any).wheelDown` | FIXABLE | Reuse the `wheelKey.wheelDown` narrow from #9. |
| 11 | `src/components/ultraplan/UltraplanChoiceDialog.tsx:100` `(key as any).wheelUp` | FIXABLE | Reuse the `wheelKey.wheelUp` narrow from #9. |
| 12 | `src/components/ultraplan/UltraplanChoiceDialog.tsx:101` `(key as any).wheelUp` | FIXABLE | Reuse the `wheelKey.wheelUp` narrow from #9. |
| 13 | `src/components/PromptInput/PromptInput.tsx:1802` `previousModeBeforeAuto as any` | FIXABLE | Type `previousModeBeforeAuto` as the same permission mode type used by `toolPermissionContext.mode`, then assign it directly. |
| 14 | `src/components/PromptInput/PromptInput.tsx:1808` `previousModeBeforeAuto as any` | FIXABLE | Same as #13; one state type fix removes both casts. |
| 15 | `src/components/messages/AttachmentMessage.tsx:146` `attachment as any` | FIXABLE | Add a `ToolDiscoveryAttachment` union member or local guard `isToolDiscoveryAttachment(attachment)` with typed `tools: { name: string }[]`. |
| 16 | `src/components/messages/UserTextMessage.tsx:106` `UserGitHubWebhookMessage as any` | FIXABLE | Type the lazy required component as `React.ComponentType<{ addMargin: boolean; param: typeof param }>` before `React.createElement`. |
| 17 | `src/components/messages/UserTextMessage.tsx:160` `UserForkBoilerplateMessage as any` | FIXABLE | Use the same `React.ComponentType<{ addMargin: boolean; param: typeof param }>` pattern. |
| 18 | `src/components/messages/UserTextMessage.tsx:173` `UserCrossSessionMessage as any` | FIXABLE | Use the same component prop type pattern. |
| 19 | `src/components/ConsoleOAuthFlow.tsx:275` `{ modelType: 'anthropic' } as any` | FIXABLE | Add `modelType?: 'anthropic' \| 'openai' \| 'gemini'` to the settings update type accepted by `updateSettingsForSource`. |
| 20 | `src/components/ConsoleOAuthFlow.tsx:680` `'anthropic' as any` | FIXABLE | Same settings type fix as #19. |
| 21 | `src/components/ConsoleOAuthFlow.tsx:682` settings object `as any` | FIXABLE | Same settings type fix as #19, including `env` shape compatibility. |
| 22 | `src/components/ConsoleOAuthFlow.tsx:900` `'openai' as any` | FIXABLE | Same settings type fix as #19. |
| 23 | `src/components/ConsoleOAuthFlow.tsx:902` settings object `as any` | FIXABLE | Same settings type fix as #19. |
| 24 | `src/components/ConsoleOAuthFlow.tsx:1133` `'gemini' as any` | FIXABLE | Same settings type fix as #19. |
| 25 | `src/components/ConsoleOAuthFlow.tsx:1135` settings object `as any` | FIXABLE | Same settings type fix as #19. |
| 26 | `src/components/permissions/PermissionRequest.tsx:106` monitor permission component `as any` | FIXABLE | Define a shared `PermissionRequestComponent` prop type and type `MonitorPermissionRequest ?? FallbackPermissionRequest` to that component type. |
| 27 | `src/utils/sideQuery.ts:224` `requestParams as any` | FIXABLE | Type `requestParams` as the OpenAI chat completion create params accepted by `client.chat.completions.create`, including tool fields and non-streaming response shape. |
| 28 | `src/utils/execFileNoThrowPortable.ts:75` `(execaSync as any)(command, ...)` | FIXABLE | Use the proper execa command API for shell strings or add a typed wrapper with `(command: string, options: ExecaSyncOptions) => ExecaSyncReturnValue`. |
| 29 | `src/utils/ultraplan/ccrSession.ts:104` `(m as any).message.content` assistant | FIXABLE | Narrow `m` to the assistant SDK message type and read `m.message.content` through that imported type. |
| 30 | `src/utils/ultraplan/ccrSession.ts:112` `(m as any).message.content` user | FIXABLE | Narrow `m` to the user SDK message type and check `Array.isArray(m.message.content)` before iterating. |
| 31 | `src/utils/transcriptSearch.ts:100` `(p as any[])` | FIXABLE | Add a local `TextContentBlock` guard and handle `Array.isArray(p)` with `p.flatMap(block => isTextBlock(block) ? [block.text] : [])`. |
| 32 | `src/utils/filePersistence/outputsScanner.ts:72` `readdir(...) as any[]` | FIXABLE | Type `entries` as `Awaited<ReturnType<typeof fs.readdir>>` for the recursive call or as `Dirent[]` if the runtime always returns dirents. |
| 33 | `src/utils/filePersistence/outputsScanner.ts:116` `turnStartTime as any as number` | FIXABLE | Normalize once with `const turnStartMs = typeof turnStartTime === 'number' ? turnStartTime : turnStartTime.getTime()` and compare to `turnStartMs`. |
| 34 | `src/utils/performanceShim.ts:140` `markResourceTiming: (() => {}) as any` | FIXABLE | Add a local `PerformanceWithUndiciResourceTiming` interface with `markResourceTiming(...args: unknown[]): void`, then type `shim` against it. |
| 35 | `src/utils/performanceShim.ts:146` `(original as any).onresourcetimingbufferfull` | FIXABLE | Include `onresourcetimingbufferfull` in the local extended performance interface and cast `original` to that interface, not `any`. |
| 36 | `src/utils/performanceShim.ts:162` `(globalThis as any).__performanceShimInstalled` read | FIXABLE | Add global augmentation for `var __performanceShimInstalled: boolean \| undefined`. |
| 37 | `src/utils/performanceShim.ts:163` `(globalThis as any).__performanceShimInstalled = true` | FIXABLE | Same global augmentation as #36. |
| 38 | `src/utils/settings/validateEditTool.ts:39` `(afterValidation as any).error` | FIXABLE | Ensure `validateSettingsFileContent` returns a discriminated union with `isValid: false`, `error`, and `fullSchema`; TypeScript will narrow inside `if (!afterValidation.isValid)`. |
| 39 | `src/utils/settings/validateEditTool.ts:39` `(afterValidation as any).fullSchema` | FIXABLE | Same discriminated union fix as #38. |
| 40 | `src/utils/log.ts:233` `readdir(...) as any` | FIXABLE | Remove the cast if the local `files` type already matches, or type the variable as `Dirent[]`. |
| 41 | `src/utils/hooks/execAgentHook.ts:214` `(message as any).attachment.type` | NEEDS_UPSTREAM | The `structured_output` attachment shape needs to be restored in the shared message union. After that, narrow `message.type === 'attachment' && message.attachment.type === 'structured_output'`. |
| 42 | `src/utils/hooks/execAgentHook.ts:216` `(message as any).attachment.data` | NEEDS_UPSTREAM | Same upstream attachment union fix as #41. |
| 43 | `src/utils/computerUse/escHotkey.ts:29` `(cu as any).hotkey?.registerEscape` | FIXABLE | Extend `requireComputerUseSwift`'s return type with optional `hotkey: { registerEscape; unregister; notifyExpectedEscape }`. |
| 44 | `src/utils/computerUse/escHotkey.ts:44` `(requireComputerUseSwift() as any).hotkey?.unregister()` | FIXABLE | Same native module return type fix as #43. |
| 45 | `src/utils/computerUse/escHotkey.ts:54` `(requireComputerUseSwift() as any).hotkey?.notifyExpectedEscape()` | FIXABLE | Same native module return type fix as #43. |
| 46 | `src/utils/computerUse/hostAdapter.ts:83` `(cu as any).tcc` | FIXABLE | Extend the native module return type with optional `tcc.checkAccessibility()` and `tcc.checkScreenRecording()` methods. |
| 47 | `src/utils/computerUse/executorCrossPlatform.ts:494` `(this as any).mouseDown()` | FIXABLE | Avoid `this` typing by calling the concrete method through the object name or factoring `mouseDown`/`mouseUp` helpers outside the object literal. |
| 48 | `src/utils/computerUse/executorCrossPlatform.ts:499` `(this as any).mouseUp()` | FIXABLE | Same object-method typing fix as #47. |
| 49 | `src/utils/computerUse/executorCrossPlatform.ts:556` `action as any` | FIXABLE | Type `manageWindow(action: WindowManagementAction, opts?: WindowManagementOptions)` using the action union expected by `platform.windowManagement.manageWindow`. |
| 50 | `src/utils/computerUse/win32/bridgeClient.ts:136` `(writable as any).flush` check | FIXABLE | Introduce `type FlushableWritable = Writable & { flush?: () => void }` and cast `stdin` to that type. |
| 51 | `src/utils/computerUse/win32/bridgeClient.ts:137` `(writable as any).flush()` | FIXABLE | Same `FlushableWritable` fix as #50. |
| 52 | `src/utils/computerUse/drainRunLoop.ts:21` `(cu as any)?._drainMainRunLoop?.()` | FIXABLE | Extend the native module return type with optional `_drainMainRunLoop?: () => void`. |
| 53 | `src/utils/computerUse/common.ts:57` `'none') as any` | FIXABLE | Type `CLI_CU_CAPABILITIES` with `satisfies ComputerUseCapabilities` and use literal unions for `screenshotFiltering`. |
| 54 | `src/utils/computerUse/common.ts:62` `'darwin') as any` | FIXABLE | Same `satisfies ComputerUseCapabilities` fix as #53 for `platform`. |
| 55 | `src/utils/messageQueueManager.ts:371` `(cmd as any).origin?.kind` | FIXABLE | Add `origin?: { kind: 'channel' \| string }` to `QueuedCommand` or create a local `hasChannelOrigin(cmd)` guard. |
| 56 | `src/utils/plugins/marketplaceManager.ts:191` merged marketplace object `as any` | FIXABLE | Type all merged marketplace maps as `Record<string, KnownMarketplaceConfig>` and return that type. |
| 57 | `src/utils/forkedAgent.ts:565` `(message as any).event?.type` | NEEDS_UPSTREAM | Restore `stream_event` message typing with a discriminated `event` union containing `message_delta`. |
| 58 | `src/utils/forkedAgent.ts:566` `(message as any).event.usage` | NEEDS_UPSTREAM | Same stream event union fix as #57. |
| 59 | `src/utils/forkedAgent.ts:568` `(message as any).event.usage` | NEEDS_UPSTREAM | Same stream event union fix as #57. |
| 60 | `src/utils/deepLink/protocolHandler.ts:97` `(waitForUrlEvent as any)(5000)` | FIXABLE | Add an ambient module declaration for `url-handler-napi` exporting `waitForUrlEvent(timeoutMs: number): string \| Promise<string> \| null`. |
| 61 | `src/utils/sliceAnsi.ts:80` `(token as any).value` | FIXABLE | Type lexer tokens as a discriminated union, for example `{ type: 'ansi'; code: string } \| { type: 'text'; value: string; width: number }`, then narrow before reading `value`. |
| 62 | `src/utils/plans.ts:370` `(snapshotFiles as any[]).push(...)` | FIXABLE | Define `type SnapshotFile = NonNullable<SystemFileSnapshotMessage['snapshotFiles']>[number]` and initialize `const snapshotFiles: SnapshotFile[] = []`. |
| 63 | `src/utils/plans.ts:377` `(snapshotFiles as any[]).length` | FIXABLE | Same `SnapshotFile[]` fix as #62. |
| 64 | `src/utils/textHighlighting.ts:131` `(token as any).value.length` | FIXABLE | Share the typed ANSI/text token union from #61 and narrow to the text-token branch before reading `value`. |
| 65 | `src/utils/textHighlighting.ts:138` `(token as any).value.length` | FIXABLE | Same token union fix as #64. |
| 66 | `src/utils/sideQuestion.ts:139` `(toolUse as any).name` | FIXABLE | Use a guard `isToolUseBlock(block): block is { type: 'tool_use'; name: string }` before reading `name`. |
| 67 | `src/utils/sideQuestion.ts:151` `apiErr.error as any` | FIXABLE | Normalize unknown API errors before formatting: `const error = apiErr.error instanceof Error ? apiErr.error : new Error(String(apiErr.error))`. |
| 68 | `src/utils/messages.ts:3894` `attachment as any` | FIXABLE | Same `ToolDiscoveryAttachment` union or guard as #15, shared from message attachment types. |
| 69 | `src/utils/searchExtraTools.ts:507` `(msg as any).compactMetadata` | FIXABLE | Add `compactMetadata?: { preCompactDiscoveredTools?: string[] }` to the `compact_boundary` system message variant, or use a local guard. |
| 70 | `src/utils/effort.ts:81` `'xhigh_effort' as any` | FIXABLE | Add `'xhigh_effort'` to the third-party model capability key union consumed by `get3PModelCapabilityOverride`. |
| 71 | `src/utils/sessionRestore.ts:81` `(msg.message!.content as any[])` | FIXABLE | Narrow assistant content with `Array.isArray(msg.message?.content)` and type blocks as the SDK content block union. |
| 72 | `src/utils/worktree.ts:1296` `(result as any).baseBranch` | FIXABLE | Update the worktree creation result union so the `!result.existed` branch includes `baseBranch: string`. |
| 73 | `src/utils/permissions/permissions.ts:416` `suggestions as any` | FIXABLE | Same permission hook signature alignment as #4. |
| 74 | `src/utils/permissions/permissions.ts:427` `decision.updatedPermissions as any` | FIXABLE | Type hook decisions so `updatedPermissions` is `PermissionUpdate[]`, matching `persistPermissionUpdates`. |
| 75 | `src/utils/permissions/permissions.ts:432` `decision.updatedPermissions as any` | FIXABLE | Same hook decision type fix as #74, matching `applyPermissionUpdates`. |
| 76 | `src/utils/auth.ts:120` `(settings as any).modelType === 'openai'` | FIXABLE | Add `modelType?: 'anthropic' \| 'openai' \| 'gemini'` to the settings type returned by `getSettings_DEPRECATED`. |
| 77 | `src/utils/auth.ts:121` `(settings as any).modelType === 'gemini'` | FIXABLE | Same settings type fix as #76. |
| 78 | `src/utils/swarm/inProcessRunner.ts:1452` `(m.message?.content ?? []) as any[]` | FIXABLE | Narrow assistant message content with `Array.isArray`, type blocks as SDK content blocks, and use a typed `isTextBlock`/`isToolUseBlock` guard. |
| 79 | `src/constants/promptEngineeringAudit.runner.ts:15` `(globalThis as any).MACRO` | FIXABLE | Add or reuse global `MACRO` augmentation and assign `globalThis.MACRO` directly. |
| 80 | `src/constants/promptEngineeringAudit.runner.ts:217` `] as any` tools array | FIXABLE | Type `standardTools` as `Tools` or `satisfies Tools` using the expected minimal tool shape. |
| 81 | `src/constants/outputStyles.ts:188` `(style as any).source` | FIXABLE | Extend `OutputStyleConfig` with optional plugin metadata fields `source?: 'plugin' \| ...` and `forceForPlugin?: boolean`. |
| 82 | `src/constants/outputStyles.ts:189` `(style as any).forceForPlugin` | FIXABLE | Same output style config extension as #81. |
| 83 | `src/services/vcr.ts:272` `.filter(Boolean) as any` | FIXABLE | Replace with a typed predicate, for example `.filter((block): block is NonNullable<typeof block> => block !== null && block !== undefined)`. |
| 84 | `src/services/tokenEstimation.ts:482` `block.content as any` | FIXABLE | Align `roughTokenCountEstimationForContent` with the tool-result content type or normalize tool result content into the accepted content union first. |
| 85 | `src/services/skillSearch/prefetch.ts:244` signal object `as any` | FIXABLE | Define `SkillSearchPrefetchSignal` with `queryText`, `startedAt`, `durationMs`, `indexSize`, and `method: 'tfidf'`, then pass that type to logging. |
| 86 | `src/services/skillSearch/prefetch.ts:309` signal object `as any` | FIXABLE | Same `SkillSearchPrefetchSignal` type as #85. |
| 87 | `src/services/notifier.ts:139` `plist.parse(...) as any` | FIXABLE | Cast to `unknown` first and validate object shape, or use `as Record<string, unknown>` without `any`. |
| 88 | `src/tasks/LocalShellTask/killShellTasks.ts:18` `(task as any).status` | FIXABLE | Reorder the condition to `if (!isLocalShellTask(task) || task.status !== 'running')`, so the guard narrows before reading `status`. |
| 89 | `src/buddy/companionReact.ts:76` `(m as any).message?.content` | FIXABLE | Narrow to user message type and use a helper `getMessageContent(m): string \| ContentBlock[] \| undefined`. |
| 90 | `src/buddy/companionReact.ts:92` `(m as any).message?.content` | FIXABLE | Same message content helper as #89 for user and assistant messages. |
| 91 | `src/entrypoints/mcp.ts:147` `(validationResult as any).message` | FIXABLE | Ensure the validation result union has `{ result: false; message: string }`; the `!validationResult.result` branch should then narrow. |
| 92 | `src/entrypoints/cli.tsx:13` `(globalThis as any).MACRO` | FIXABLE | Same global `MACRO` augmentation as #79. |
| 93 | `src/entrypoints/cli.tsx:149` `ChannelPermissionRequestNotificationSchema() as any` | NEEDS_UPSTREAM | Restore MCP notification schema typing for channel permission request notifications. |
| 94a | `packages/builtin-tools/src/tools/FileReadTool/FileReadTool.ts:913` `(extractResult as any).error.message` | FIXABLE | Fix the PDF result discriminated union so `!extractResult.success` narrows to `{ error: { message: string; reason?: string } }`. |
| 94b | `packages/builtin-tools/src/tools/FileReadTool/FileReadTool.ts:917` `(extractResult as any).data.file.count` | FIXABLE | Same PDF result union fix as #94a; the success branch should expose `data.file.count`. |
| 94c | `packages/builtin-tools/src/tools/FileReadTool/FileReadTool.ts:984` `(extractResult as any).error.reason` | FIXABLE | Same PDF result union fix as #94a; the failure branch should expose `error.reason`. |
| 94d | `packages/builtin-tools/src/tools/FileReadTool/FileReadTool.ts:1000` `(readResult as any).error.message` | FIXABLE | Apply the same discriminated result type to `readPDF`. |
| 94e | `packages/builtin-tools/src/tools/FileReadTool/FileReadTool.ts:1177` `(sharp as any)(imageBuffer)` | FIXABLE | Type the dynamic sharp import as `typeof import('sharp')` and normalize default export with a typed callable `SharpFactory`. |
| 95a | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts:789` `(message as any).event.type` | NEEDS_UPSTREAM | Restore the subagent `stream_event` message type carrying `event: { type: 'message_start' }`. |
| 95b | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts:790` `(message as any).ttftMs` check | NEEDS_UPSTREAM | Same subagent stream event type as #95a, with optional `ttftMs: number`. |
| 95c | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts:792` `(message as any).ttftMs` use | NEEDS_UPSTREAM | Same subagent stream event type as #95a. |
| 95d | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts:799` `(message as any).attachment.type` | NEEDS_UPSTREAM | Restore attachment union member `{ type: 'attachment'; attachment: { type: 'max_turns_reached'; maxTurns: number } }`. |
| 95e | `packages/builtin-tools/src/tools/AgentTool/runAgent.ts:808` `(message as any).attachment.maxTurns` | NEEDS_UPSTREAM | Same attachment union member as #95d. |

## Notes On Count Drift

- The task file describes "94 `as any`" but also groups multi-cast blocks under single numbered items for `FileReadTool` and `AgentTool`.
- The targeted current source scan found 104 literal `as any` tokens in the listed files, including one comment-only hit in `src/hooks/useVirtualScroll.ts:186`.
- This plan keeps the task numbering through #94 and labels grouped literal casts as #94a-#94e and #95a-#95e so every actual listed code cast has a concrete classification and fix.

## Expected Outcome

- All `FIXABLE` rows can be removed with local type work.
- `JUSTIFIED` rows require no type-safety change.
- `NEEDS_UPSTREAM` rows should wait for restored MCP/SDK/message schema contracts or be handled in a separate upstream-type restoration task.
