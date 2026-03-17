---
description: Dispatch multiple specialized subagents in parallel for 2+ independent tasks with no shared state.
---

# Skill: dispatching-parallel-agents

**Core principle:** One agent per independent problem domain. Let them work concurrently.

## When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Problems understandable without context from other failures
- No shared state between investigations

## When NOT to Use

- Failures are related (fixing one might fix others)
- Need to understand full system state first
- Agents would edit the same files
- Still in exploratory debugging phase

## The Four-Step Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests → Tool approval flow
- File B tests → Batch completion
- File C tests → Abort functionality

Each is independent.

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed
- **All context needed:** They get NO session history

### 3. Dispatch in Parallel

Use Task tool to run multiple agents concurrently.

### 4. Review and Integrate

- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Agent Prompt Requirements

| Requirement | Bad | Good |
|-------------|-----|------|
| Scope | "Fix all tests" | "Fix agent-tool-abort.test.ts" |
| Context | "Fix the race condition" | Paste actual error messages |
| Constraints | (none) | "Do NOT change production code" |
| Output | "Fix it" | "Return summary of root cause and changes" |
