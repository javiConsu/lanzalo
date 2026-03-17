# Lanzalo - Claude Code Configuration

## Superpowers Skills

This project uses the [Superpowers](https://github.com/obra/superpowers) skill framework.

### Core Rule: Skills First

**If a skill applies to your task, you MUST invoke it BEFORE any response or action — even with only 1% certainty.**

Non-negotiable. No exceptions.

**Instruction priority:**
1. User's explicit instructions (this file, direct requests)
2. Superpowers skills (override Claude defaults)
3. Default Claude behavior

**Red flags — stop and load the relevant skill:**
- "This is just a simple question"
- "Let me just explore first"
- "I'll gather info before using the skill"
- "This is too simple for a full process"

**Skills invoke process skills before implementation skills.**

### Available Skills

| Skill | When to use | Command |
|-------|-------------|---------|
| `brainstorming` | Before implementing any feature — design first | `/brainstorm` |
| `writing-plans` | After brainstorming, before writing code | `/write-plan` |
| `test-driven-development` | When implementing any feature or bugfix | `/tdd` |
| `systematic-debugging` | Any technical issue, test failure, or bug | `/debug` |
| `subagent-driven-development` | Executing plans with independent tasks | `/subagent-dev` |
| `executing-plans` | Running pre-written plans step by step | `/execute-plan` |
| `dispatching-parallel-agents` | 2+ independent tasks with no shared state | `/dispatch-agents` |
| `finishing-a-development-branch` | Implementation complete, need to integrate | `/finish-branch` |
| `requesting-code-review` | After major feature or before merge | `/request-review` |
| `receiving-code-review` | When receiving review feedback | `/receive-review` |
| `verification-before-completion` | Before claiming any work is done | `/verify` |

### Skill Trigger Guide

```
Starting new feature?          → brainstorming → writing-plans → tdd
Something is broken?           → systematic-debugging
Have a plan ready?             → subagent-driven-development OR executing-plans
Multiple independent failures? → dispatching-parallel-agents
Implementation done?           → verification-before-completion → finishing-a-development-branch
Got code review feedback?      → receiving-code-review
```

### Forbidden Responses

**NEVER say:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" (before verification)
- "This should work" / "It probably works"

**ALWAYS:**
- Verify before claiming anything works
- Run tests fresh before asserting they pass
- Show evidence, not assumptions
