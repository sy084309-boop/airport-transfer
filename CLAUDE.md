# ⚠️ 強制協議 — 每次任務前後必執行（違規 2 次記錄在案）

## 任務開始前（先過這 3 題才准動手）
1. **讀** `.remember/now.md` 確認上次中斷點
2. **問** 不確定的需求先問、不要猜
3. **想** 改哪裡、影響哪些檔案、會不會改 A 壞 B

## 🚫 不准直接寫 code — 先叫對的人
- 任何任務 → 先叫 **Nora**（`/hello-nora`）派發給對的角色
- commit 前 → 先叫 **Ray**（`/ray-review`）過 3-gate
- 踩坑/犯規 → 叫 **Kai**（`/kai-knowledge`）記進知識庫
- 收工前 → 叫 **Coach**（`/coach-loop`）彙整本日
- 手機上線 → 叫 **Ace**（`/ace-exec`）跑步驟 0-3

## 任務結束後（全部做完才准說完成）
1. **報**：交辦 BOSS → 經手 [角色] → 完成 [角色] → 測試 Ray
2. **檢**：語法（無 error）/ 邏輯（方向對）/ 整合（submit 跟 layout 一致）
3. **清**：commit 乾淨、沒殘留 debug 碼、沒孤兒 process

---
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
