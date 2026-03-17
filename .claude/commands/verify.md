---
description: Verify work before claiming completion. Run fresh verification, read full output, show evidence.
---

# Skill: verification-before-completion

**Core mandate: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

## Before Asserting Anything Works

1. Identify the verification command
2. Run it **fully and freshly** (not from cache or memory)
3. Read **complete output** and exit codes
4. Verify the output confirms your claim
5. Only then make the assertion

## What Does NOT Count as Verification

- Trusting previous runs
- Assuming based on code changes ("this should work now")
- Relying on partial checks
- Using hedging language: "should", "probably", "likely"

## Red Flags — Dishonest Patterns

- Language implying success without running verification
- Committing/pushing before testing
- "Everything looks good" without showing output
- Trusting subagent reports without independent verification

## Verification Commands for This Project

```bash
# Run tests
npm test

# Check build
npm run build

# Check types
npm run typecheck

# Lint
npm run lint
```

## The Standard

Show the actual output. Not a summary. Not "tests passed." Show:
```
✓ 42 tests passed
✓ Build: 1.2s, 0 errors
```

This is non-negotiable. Rooted in honesty as a core value.
