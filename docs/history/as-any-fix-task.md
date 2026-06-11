# Execute: Fix All 87 FIXABLE `as any` Casts

## Source Plan
Read `docs/plans/as-any-cleanup.md`. Execute ONLY the items marked **FIXABLE** in the Classification column. Skip all NEEDS_UPSTREAM and JUSTIFIED items.

## IMPORTANT
- This is a real execution task — MODIFY source files
- Fix ALL 87 FIXABLE items, not a subset
- Do NOT touch: generated files, test files, community commands (acp/autofix-pr/share/issue), API providers (openai/grok/gemini), node_modules, dist, bun.lock
- After each logical group of 15-20 fixes, verify with `bun run typecheck` (PATH includes ~/.bun/bin)
- Commit after each verified batch with clear message
- If a fix causes NEW type errors that weren't there before, revert that specific fix and note it

## Verification
After all 87 are done, run:
```bash
export PATH="$HOME/.bun/bin:$PATH"
bun run build    # must pass
bun run typecheck 2>&1 | grep "error TS" | wc -l  # must be 20 or fewer (community code)
```

## Commit Convention
`fix(type): <brief description of fixes>`
