---
description: Request a code review via subagent after completing a feature or before merging.
---

# Skill: requesting-code-review

## When Mandatory

- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

## Process

1. **Get commit hashes:**
   ```bash
   git log --oneline -10  # find base and head SHAs
   ```

2. **Dispatch code-reviewer subagent** with this template:

   ```
   Review the implementation between commits:
   - Base SHA: <base-sha>
   - Head SHA: <head-sha>

   What was implemented: <description>

   Requirements/plan: <paste relevant plan section>

   Brief description: <1-2 sentences>
   ```

3. **Address feedback by severity:**

| Severity | Action |
|----------|--------|
| Critical | Fix immediately before proceeding |
| Important | Fix before moving to next task |
| Minor | Note for later |

## Pushing Back on Feedback

You CAN challenge reviewer feedback that appears technically incorrect. Provide:
- Supporting code evidence
- Test results
- Architectural reasoning

## Red Flags — Never

- Skip review because "it's a simple change"
- Ignore Critical findings
- Proceed with unfixed Important issues
- Dismiss valid feedback without technical justification
