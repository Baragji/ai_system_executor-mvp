---
name: "Technical Validation Checklist"
about: "Runbook for validating workflow and executor tracks"
title: "Validation: <brief summary>"
labels: ["validation", "workflow", "executor"]
assignees: []
---

> **Instructions**
> Follow this runbook step-by-step. If any step is ambiguous or fails, **STOP & ASK** before proceeding.

## 0) Grounding & Scope
- [ ] Read the “what belongs where” primer and confirm the workflow and product tracks are distinct.
- [ ] Plan to validate **both** tracks independently.

---

## 1) File Review Protocol (100% coverage)
- [ ] List every file changed on the branch (added/modified/deleted).
- [ ] For **each** touched file:
  - [ ] Open and read the file fully.
  - [ ] Identify whether it belongs to the Workflow or Product track.
  - [ ] Confirm logic is real (no placeholders).
  - [ ] Record external effects (file writes, env flags, I/O).
  - [ ] Log PASS/FAIL with rationale.

> Do not proceed until **all** files are reviewed.

---

## 2) Workflow-Track Validation (automation loop)
### 2.1 Evidence Detection
- [ ] Evidence detector maps real actions to real criteria (no placeholders).
- [ ] Detector reads from live logs (e.g., `.automation/actions.jsonl`), not fixtures.
- [ ] Evidence text exactly matches ledger wording; if drift is suspected, **STOP & ASK**.

### 2.2 Gate Auto-Update
- [ ] Updater only checks the correct checkbox and appends evidence.
- [ ] No ledger content is deleted.
- [ ] Logs clearly show the write.
- [ ] Orchestration order: evidence → ledger write → state sync.

### 2.3 End-to-End Loop Test
- [ ] Run `npm run state:next` (or `npm run state:next:auto`).
- [ ] Confirm detector fires, `GATES_LEDGER.md` updates, contracts resync, and the suggested task advances.
- [ ] Verify any required env flags (e.g., `GATE_AUTO_UPDATE`) default to enabled in production. If unclear, **STOP & ASK**.

---

## 3) Executor (Product) Validation
- [ ] Confirm no workflow code leaks into `src/` runtime.
- [ ] Ensure public APIs do not expose workflow internals.
- [ ] Verify prior contamination was removed (e.g., no `phaseState` in product types).

---

## 4) Criteria & Ledger Alignment
- [ ] Treat `.automation/GATES_LEDGER.md` as the canonical source of truth.
- [ ] Evidence rules must reference the exact ledger strings.
- [ ] Tests must exercise the real ledger; file defects immediately if drift is detected.

---

## 5) G3 Aggregation & Command Fidelity (critical)
- [ ] Validate G3 evidence detection works when `/api/execute` and parity tests run separately (context aggregation across commands).
- [ ] Recorded ledger command must be the actual `curl … /api/execute` (not a placeholder or test command). If not, **STOP & ASK**.

---

## 6) Quality Gates (all must pass)
Run these commands exactly:
```bash
npm run lint
npm run typecheck
npm test
npm run contract:check
```
- [ ] `npm run lint` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm test` passes (no flaky tests without explicit skips/justification).
- [ ] `npm run contract:check` succeeds.

---

## 7) Artifacts & Evidence Bundle
- [ ] Capture detector output:
  ```bash
  node scripts/detect-evidence.js --json > .automation/_tmp/detect_after.json
  ```
  Confirm G3 evidence includes the real `curl … /api/execute` command.
- [ ] Save diffs:
  ```bash
  git diff .automation/GATES_LEDGER.md
  npm run state:show > .automation/_tmp/state_after.txt
  ```
  Ensure the suggested task advances.

---

## 8) Documentation & Migration
- [ ] Confirm behavior changes are documented so future validators avoid regressions.
- [ ] Update docs if criteria names, aggregation rules, or flows changed.

---

## 9) Final Decision
- [ ] Approve only if all sections pass.
- [ ] Otherwise, block the PR with precise failure details and reproduction steps.

---

### Optional Output Formats
- [ ] If needed, export this checklist as a 1-page PDF for offline use.
- [ ] Alternatively, adapt it into additional templates (e.g., for GitHub Projects).
