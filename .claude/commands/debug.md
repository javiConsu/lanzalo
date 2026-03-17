---
description: Systematic debugging for any technical issue, test failure, bug, or unexpected behavior.
---

# Skill: systematic-debugging

**The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Symptom fixes are failure. Always find root cause first.

## When to Use

- Test failures
- Bugs or unexpected behavior
- Performance problems
- Build failures
- Integration issues
- **Especially under time pressure** when "just one quick fix" seems obvious

## Four Phases (complete each before proceeding)

### Phase 1: Root Cause Investigation

1. Read error messages completely (stack traces, line numbers, file paths)
2. Reproduce consistently
3. Check recent changes: `git diff`, recent commits, new dependencies
4. Add diagnostic instrumentation at component boundaries if needed
5. Trace data flow: where does the bad value originate?

### Phase 2: Pattern Analysis

- Find working examples of similar code
- Read them completely, not skim
- Identify every difference between working and broken
- Understand all dependencies

### Phase 3: Hypothesis and Testing

- Form ONE hypothesis: "I think X is the root cause because Y"
- Test ONE variable at a time
- Verify before continuing
- If didn't work → form NEW hypothesis (don't tweak the same fix)

### Phase 4: Implementation

1. Create failing test case
2. Implement single fix addressing root cause
3. Verify fix
4. If fix doesn't work:
   - < 3 attempts → return to Phase 1
   - ≥ 3 attempts → **STOP. Question architecture.**

## 3+ Fixes Failed → Question Architecture

Stop and discuss with human partner before more attempts when:
- Each fix reveals new shared state/coupling
- Fixes require massive refactoring
- Each fix creates new symptoms

## Red Flags — STOP and Follow Process

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "I don't fully understand but this might work"
- "One more fix attempt" (after already trying 2+)

## Reality Check

| Approach | Time | First-fix rate |
|----------|------|----------------|
| Systematic | 15-30 min | 95% |
| Random fixes | 2-3 hours | 40% |
