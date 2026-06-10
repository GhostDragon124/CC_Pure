import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const HOOK_SCRIPT = `#!/bin/bash
# Claude Code commit attribution hook — installed automatically.
# DO NOT EDIT — regenerated on every worktree setup.

COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"

# Skip during rebase, merge, cherry-pick, squash, and template commits.
# Only compute attribution for normal commits.
case "$COMMIT_SOURCE" in
  message|commit) ;;
  *) exit 0 ;;
esac

# Check for transient git states.
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || exit 0
for indicator in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD BISECT_LOG; do
  if [ -f "$GIT_DIR/$indicator" ]; then
    exit 0
  fi
done

# Compute attribution. When the CC daemon is running, it can write
# an attribution trailer. Otherwise skip gracefully.
# (Full implementation: invokes CC's attribution computation.)
`

/**
 * Installs a prepare-commit-msg git hook for commit attribution tracking.
 * Called during worktree setup when COMMIT_ATTRIBUTION feature is enabled.
 *
 * @param worktreePath - Root directory of the worktree
 * @param worktreeHooksDir - Optional explicit hooks directory (e.g., .husky/).
 *   When omitted, defaults to {worktreePath}/.git/hooks.
 */
export async function installPrepareCommitMsgHook(
  worktreePath: string,
  worktreeHooksDir?: string,
): Promise<void> {
  const hooksDir = worktreeHooksDir ?? join(worktreePath, '.git', 'hooks')

  // Create hooks directory if it doesn't exist
  await mkdir(hooksDir, { recursive: true })

  const hookPath = join(hooksDir, 'prepare-commit-msg')
  await writeFile(hookPath, HOOK_SCRIPT)
  await chmod(hookPath, 0o755)
}
