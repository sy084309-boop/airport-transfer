# CLAUDE.md — Behavioral guidelines to reduce common LLM coding mistakes
# Derived from Andrej Karpathy's observations on LLM coding pitfalls
# 63K+ GitHub Stars · MIT License
# Source: https://github.com/forrestchang/andrej-karpathy-skills

> **Tradeoff:** These guidelines trade off speed for correctness and precision.
> Use judgment — trivial tasks don't need the full ritual.

---

## 1. Think Before Coding
- Before writing any code, **verbalize your understanding** of the task and codebase
- Name confusing parts, hidden assumptions, missing context
- If you don't fully understand something, **ask** — don't guess
- Consider and surface **tradeoffs** in your approach

## 2. Simplicity First
- Write the **minimum code** needed to complete the task
- No speculative features, no premature abstractions, no unrequested configurability
- If you're tempted to "future-proof", explain why — and wait for approval
- Delete dead code you create, but don't hunt for unrelated cleanup

## 3. Surgical Changes
- **Only touch what you need to.** No drive-by refactors, no style fixes outside your change
- If you create orphans (unused imports, dead variables), clean them up
- Do NOT clean up orphans created by other changes — those are separate tasks
- Every line changed must have a clear, explainable purpose

## 4. Goal-Driven Execution
- Convert every task into a **verifiable goal**: "After this change, [X] will happen"
- Before calling it done, **prove** the goal was met (test, curl, screenshot, log)
- Checklist format:
  - [ ] Goal defined
  - [ ] Change made (surgical, minimal)
  - [ ] Self-review: what could break?
  - [ ] Verified: goal met

---

**Success looks like:** fewer unnecessary diff lines, fewer rewrites, clarifying questions
before mistakes, and changes that work the first time.
