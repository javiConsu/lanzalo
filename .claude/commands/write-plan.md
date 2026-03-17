---
description: Write a comprehensive implementation plan before writing code. Use after brainstorming and before executing.
---

# Skill: writing-plans

**Announce at start:** "I'm using the writing-plans skill."

## Core Purpose

Write a comprehensive implementation plan assuming the engineer has zero context for this codebase.

## Plan Structure

Save to: `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

### Mandatory Header

```markdown
## Goal
[Single sentence: what this achieves]

## Architecture Overview
[How this fits into existing system]

## Tech Stack
[Languages, frameworks, libraries involved]
```

## File Mapping

Before writing tasks, map all files:
- Files to **create** (with purpose)
- Files to **modify** (with what changes)
- Each file: one clear responsibility, well-defined interface

## Task Granularity

Each task = 2-5 minutes of work.

Pattern per task:
```
- [ ] Write failing test for X
- [ ] Verify test fails (run: `<command>`)
- [ ] Implement X minimally
- [ ] Verify test passes (run: `<command>`)
- [ ] Commit: "feat: X"
```

## Plan Quality Requirements

- Exact file paths (not "somewhere in src/")
- Complete code examples where helpful
- Specific commands with expected outputs
- DRY, YAGNI principles applied
- Checkbox syntax for progress tracking

## Review & Execution

After writing:
1. Dispatch plan-reviewer subagent to validate against spec
2. Iterate up to 3 times based on feedback
3. Once approved → invoke `subagent-driven-development` (preferred) or `executing-plans`
