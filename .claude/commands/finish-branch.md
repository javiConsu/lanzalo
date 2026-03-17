---
description: Complete a development branch after implementation. Verify tests, present integration options, execute choice.
---

# Skill: finishing-a-development-branch

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## Step 1 — Verify Tests

Run the full test suite.

**If tests fail:** STOP. Show failures. Do NOT proceed to Step 2.

## Step 2 — Determine Base Branch

```bash
git merge-base HEAD main
```

Or ask the user.

## Step 3 — Present Options (exact wording)

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

## Step 4 — Execute Choice

**Option 1 — Merge locally:**
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
# Run tests again
git branch -d <feature-branch>
git worktree remove <path>
```

**Option 2 — Create PR:**
```bash
git push -u origin <feature-branch>
gh pr create --title "..." --body "..."
git worktree remove <path>
```

**Option 3 — Keep:**
Report branch name and worktree path. Do not clean up.

**Option 4 — Discard:**
Require typed "discard" confirmation first, then:
```bash
git branch -D <feature-branch>
git worktree remove <path>
```

## Hard Rules

- Never proceed with failing tests
- Never merge without verifying tests on result
- Never delete work without explicit confirmation
- Never force-push without explicit user request
