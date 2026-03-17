---
description: Test-driven development. Use when implementing any feature or bugfix, before writing implementation code.
---

# Skill: test-driven-development

## The Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Any code written before tests must be **deleted entirely** and reimplemented after writing the test.

## Red-Green-Refactor Cycle

### RED
1. Write one minimal test demonstrating the desired behavior
2. Test name clearly states what's being tested
3. Use real code, avoid unnecessary mocks
4. Run and confirm: test fails

### Verify RED
- Test must fail **for the right reason**
- "Expected X but got Y" — not "SyntaxError" or "Import error"

### GREEN
1. Write the **simplest possible code** to make the test pass
2. No extra logic, no future-proofing
3. Run and confirm: test passes + all others still pass

### Verify GREEN
- All tests pass
- No new warnings or errors

### REFACTOR
- Clean up code while staying green
- Run tests after every change
- Stop when clean and green

## Verification Checklist

Before claiming implementation is done:
- [ ] Every new function has at least one test
- [ ] Each test was observed **failing first**
- [ ] Minimal code written for each test
- [ ] All tests pass
- [ ] No warnings or errors

## Rejected Rationalizations

| Excuse | Truth |
|--------|-------|
| "Too simple to test" | Simple things break too |
| "I'll test after" | Tests written after pass immediately — prove nothing |
| "Already manually tested" | Manual testing is ad-hoc and forgotten under pressure |
| "Deleting hours of work is wasteful" | It's more wasteful to have untested code in production |
