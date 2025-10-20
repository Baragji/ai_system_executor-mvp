# Priority 2 — SHOULD FIX (Important)

Goal: Reduce execution risk and improve traceability with validation cadence, progress tracking, and regression assurance.

Scope (complete all):
- Add intermediate validations within batches
- Create and maintain a progress tracker
- Establish a regression test cadence after every batch
- Document explicit rollback triggers and decision tree

Notes:
- Keep all checks lightweight and fast.
- Never proceed to next batch if any validation fails.

---

## 1) Intermediate Validation Steps (within each batch)

Deliverables:
- Updated batch plan lines (in 06_revised_batches_plan.md) to include per-step checks

Pattern (apply to all extraction/integration batches):
1. Perform micro-step (e.g., copy files only)
   - Validate: files exist at destination, git diff shows only expected files
2. Fix imports in copied files
   - Validate: service-level typecheck passes (e.g., in services/llm-gateway)
3. Update service routes to use local domain
   - Validate: grep shows no ../../../../src/ in service
4. Add dependencies (if required)
   - Validate: npm install succeeds; lockfile updated
5. Boot test
   - Validate: curl health endpoint returns 200

Acceptance criteria:
- [ ] Every batch in 06_revised_batches_plan.md contains explicit per-step validations
- [ ] Grep checks included to ensure no deep imports remain in a completed service
- [ ] Typecheck/lint/test checkpoints present where applicable

---

## 2) Progress Tracking File

Deliverables:
- .automation/refactor_progress.md

Template (copy this into the new file):

# Refactor Progress Tracker

Legend: [ ] not-started | [~] in-progress | [x] completed

- Batch 0: Discovery — [ ]
- Batch 1a: Validation scripts (services) — [ ]
- Batch 1b: Validation scripts (root) — [ ]
- Batch 2a: Service discovery doc — [ ]
- Batch 2b: Root .env.example update — [ ]
- Batch 2c: Service .env.example updates — [ ]
- Batch 3a–3e: LLM extraction — [ ] [ ] [ ] [ ] [ ]
- ...

Update rules:
- After each batch completes, change its entry to [x] with a short note and commit.
- If a batch is currently underway, mark [~] and include a timestamp + branch name.

Acceptance criteria:
- [ ] Progress file exists and is committed with initial content
- [ ] Updated after each completed batch
- [ ] Used by agents before starting any new work

---

## 3) Regression Test Cadence (after every batch)

Deliverables:
- Documentation block appended to 06_revised_batches_plan.md describing this cadence

Checklist to execute after each batch:
1. Monolith still works (flags OFF)
   - npm test (must pass)
2. Type-safety
   - npm run typecheck (must pass)
3. Lint
   - npm run lint (must pass; zero warnings enforced)
4. Coverage threshold
   - npm test -- --coverage (≥80% line / ≥75% branch)
5. Contract integrity
   - npm run contract:check (must pass)
6. Service boot (if batch touched a service)
   - npm start in service and curl /healthz (200)

Acceptance criteria:
- [ ] Regression checklist added to the plan and followed after each batch
- [ ] Evidence of passing runs captured in commit messages or CI logs

---

## 4) Rollback Triggers & Decision Tree

Deliverables:
- docs/10_201025_todays_status/08_rollback_triggers.md

Content to include:
- When to HALT and rollback immediately:
  1. npm test fails (with flags OFF)
  2. npm run typecheck fails
  3. Coverage drops below thresholds
  4. Service won’t boot after extraction batch
  5. Deep imports remain after an extraction batch
  6. New dependency installation fails
  7. API contract break detected
- Decision tree:
  - If any of the above: stop → revert batch branch → document failure → request human guidance → do not continue
- Failure report template block for agents to paste into PR/issue

Acceptance criteria:
- [ ] Rollback doc exists with clear triggers and actions
- [ ] Agents link this doc in failure reports

---

## Global Validation (run before marking Priority 2 done)
- [ ] Lint/typecheck/tests pass locally
- [ ] Contract checks pass
- [ ] Progress file present and updated
- [ ] Regression cadence documented and observed for at least one completed batch

