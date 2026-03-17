---
description: Brainstorm and design a feature before any implementation. Hard gate — no code until design is approved.
---

# Skill: brainstorming

**Announce at start:** "I'm using the brainstorming skill. No code will be written until you approve a design."

## Hard Gate

**DO NOT** invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.

## Nine Sequential Steps

1. **Explore project context** — Read relevant existing code, understand architecture
2. **Offer visual companion** — Ask if mockups/diagrams would help
3. **Ask clarifying questions** — One at a time; prefer multiple-choice; focus on purpose, constraints, success criteria
4. **Propose 2-3 approaches** — With trade-offs for each
5. **Present design sections** — Break into isolated units with clear purposes and well-defined interfaces
6. **Write and commit design documentation** — Save to `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
7. **Run spec through review loop** — Dispatch review subagent, max 3 iterations
8. **Get user approval** — Explicit approval of the written spec required
9. **Invoke writing-plans** — The ONLY next skill after brainstorming

## Key Principles

- One question per message
- Break systems into isolated units with clear purposes
- "Simple" projects often hide unexamined assumptions that waste work later
- The ONLY skill invoked after brainstorming is `writing-plans`

## Anti-patterns

- Jumping to implementation because "it's simple"
- Asking multiple questions at once
- Writing any code before design approval
