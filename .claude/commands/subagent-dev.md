---
description: Execute implementation plans using specialized subagents with isolated context and two-stage review.
---

# Skill: subagent-driven-development

**Core concept:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

## When to Use

- Completed implementation plan exists
- Tasks are mostly independent
- Staying in current session

## Process Per Task

1. Extract task from plan with full context
2. Dispatch implementer subagent (with all needed context — they get NO session history)
3. Answer clarification questions
4. Receive implementation + self-review
5. Dispatch spec-compliance review subagent
6. Dispatch code-quality review subagent (only after spec passes)
7. Mark task complete
8. Repeat for next task
9. Final comprehensive review
10. Invoke `finishing-a-development-branch`

## Model Selection

| Task type | Model |
|-----------|-------|
| Simple mechanical (1-2 files) | Faster, cheaper model |
| Integration (multi-file) | Standard model |
| Architecture / design / review | Most capable model |

## Implementation Status Handling

- **DONE** → Proceed to spec review
- **DONE_WITH_CONCERNS** → Note concerns, continue to review
- **NEEDS_CONTEXT** → Provide missing info, re-dispatch
- **BLOCKED** → Assess root cause; adjust context, model, or scope — do NOT retry unchanged

## Critical Rules

- Never skip reviews ("it's a simple change")
- Never start code quality review before spec compliance passes
- Escalate BLOCKED subagents, don't retry unchanged
- Subagents must never inherit your session context — give them exactly what they need
