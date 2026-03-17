---
description: Execute a pre-written development plan step by step with review checkpoints.
---

# Skill: executing-plans

**Note:** Prefer `subagent-driven-development` when available. Use this for single-session sequential execution.

**Never start implementation on main/master without explicit user consent.**

## Initial Phase

1. Load the plan document
2. Review critically — identify questions or concerns
3. Raise issues **before proceeding**

## Execution Phase

For each task:
1. Mark as `in_progress`
2. Follow steps exactly as written in plan
3. Verify completion before marking done

## Completion Phase

Invoke `finishing-a-development-branch` when all tasks complete.

## Critical Safeguards

**STOP immediately** when encountering:
- Missing dependencies
- Failed tests that don't recover
- Unclear instructions
- Repeated verification failures

Do **NOT** proceed with assumptions. Ask for clarification.

## Blockers

When blocked:
- Show exactly what failed
- Show what you tried
- Ask for direction — do not guess
