### postCommitAttribution stub → implementation

Date: 2026-06-10
Commit: f037c153

Replaced no-op stub in src/utils/postCommitAttribution.ts with a working git hook installer. The function writes a prepare-commit-msg hook script to the worktree's hooks directory, skipping transient git states (rebase/merge/cherry-pick/bisect). Uses only Node built-ins (fs/promises, path) — no CC-internal deps.
