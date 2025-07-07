# AI Collaboration Protocol: Cursor Assistant & Claude Code CLI

## 1. Purpose
Define a clear, repeatable workflow so that both AIs – Cursor's Assistant ("Supervisor") and Claude Code CLI ("Builder") – operate in harmony, prevent overwrites, and keep the Turnship code-base healthy.

---

## 2. Roles & Responsibilities

| Agent | Nickname | Primary Responsibilities |
|-------|----------|--------------------------|
| Cursor Assistant | **Supervisor** | 1. Interpret product requirements (PRD/PDD).<br>2. Decide *what* needs to be built next & *why*.<br>3. Draft precise prompts for Builder.<br>4. Run quick sanity checks, lint, and tests.<br>5. Approve / request changes before merge. |
| Claude Code CLI | **Builder** | 1. Generate/modify code exactly per prompt.<br>2. Limit changes to scope of prompt.<br>3. Output diffs / patches; avoid direct `git push` to `main`.<br>4. Honour project linting & style rules.<br>5. Report any errors, blockers, or uncertainty. |

---

## 3. Standard Workflow

1. **Task Selection (Supervisor)**  
   • Based on PRD/PDD & current backlog, choose next atomic task.

2. **Prompt Drafting (Supervisor)**  
   • Write a *single, explicit* prompt for Builder detailing:  
     – Objective & acceptance criteria  
     – Files / paths to create or touch  
     – Dependencies to install (if any)  
     – Tests to generate  
     – Output mode: create patch or PR-ready branch.

3. **Dry-Run Generation (Builder)**  
   • Builder runs with `--dry-run` flag, producing a patch/diff without writing to disk.

4. **Review (Supervisor)**  
   • Inspect diff for logic, style, security.  
   • If OK → proceed.  If not → revise prompt or manually tweak.

5. **Apply & Test (Builder)**  
   • Run Builder *without* `--dry-run` to write changes.  
   • Execute `npm run lint && npm test`.  
   • Fix any failures or revert.

6. **Commit & Merge (Supervisor)**  
   • Commit to feature branch, open PR, wait for CI pass, then merge.

---

## 4. Ground Rules

1. **Single Source of Truth** – `main` branch stays green; all Builder changes go through PRs.
2. **Branch Naming** – `feat/<short-topic>` (e.g., `feat/auth-oauth`).
3. **Coding Standards** – Prettier + ESLint enforced; Builder must auto-format.
4. **Security First** – No secrets in code; use ENV vars.
5. **Granular Commits** – One logical unit per commit; include tests.
6. **Documentation** – Update README / docs when APIs or setup steps change.
7. **Rollback Plan** – If a change breaks tests, revert immediately.

---

## 5. Example Interaction

> **Supervisor Prompt:**  
> "Create an Express route `GET /api/health` that returns uptime in seconds, add Jest test, update OpenAPI spec. Patch only files under `server/`. Dry-run first."

> **Builder Output (diff)**  
> ```diff
> + server/routes/health.js
> + server/tests/health.test.js
> ∆ server/routes/index.js
> ```

Supervisor reviews → approves → Builder applies → tests pass → commit → PR merged.

---

## 6. Amendment Process

Any time the workflow proves insufficient, Supervisor will update this document via PR so both agents follow the newest rules. 