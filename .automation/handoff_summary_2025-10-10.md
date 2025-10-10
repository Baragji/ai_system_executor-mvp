# Executor MVP — Reliability Handoff (2025‑10‑10)

Audience: Incoming AI agent (blank slate). This document is a self‑contained handoff so you can continue seamlessly.

## What This System Is
- An autonomous coding executor that turns a natural‑language prompt into a tested project under `output/<slug>/`.
- Two modes: single execution and planning (decompose → execute subtasks).
- Built‑in testing, a multi‑turn repair loop, telemetry, and now fast replay fixtures.

## How To Run Locally
- Start server: `npm run dev`
- UI: open `http://localhost:3000/`
- Health: `GET /healthz`

## Validation Gate (run before any PR)
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run contract:check`
- `npm run sbom`

## Fast Replay & Debug (No Re‑Generation)
Use these to surface errors immediately and re‑run only failing steps.

- List failed subtasks: `GET /api/plan/<project>/failed-subtasks`
- List fixtures for a project: `GET /api/fixtures/<project>`
  - Response includes `sessionId` values and fixture files captured per session.
- Re‑run tests only: `POST /api/plan/<project>/retest-subtask`
- Replay repair with captured context: `POST /api/replay/repair` body: `{ "project": "<slug>", "sessionId": "<id>" }`
- Replay single subtask (apply files + run tests): `POST /api/replay/subtask` body: `{ "project": "<slug>", "sessionId": "<id>", "subtaskId": "<id>" }`
- UI helper: open `/fixtures.html` (lists sessions, one‑click “Retest Project”, “Replay Repair”, and a manual “Replay Subtask”).

## What Changed In This Work (Reliability + DX)
All changes validated: tests, lint, typecheck, contracts, SBOM — green.

1) Fixture capture + replay spine
- Files: `src/fixtures/index.ts`, `src/server.ts`, `src/planning/executeSubtask.ts`, `public/fixtures.html`, `public/fixtures.js`
- Endpoints: `/api/fixtures/:project`, `/api/replay/repair`, `/api/replay/subtask`, plus `/api/plan/:project/retest-subtask`
- Tests: `tests/utils/fixtures.test.ts`, `tests/api/fixtures-route.test.ts`

2) Output determinism
- Cleans `output/<slug>` before plan and single‑run writes to avoid stale files.
- File: `src/server.ts`

3) Timeout stability
- Kills entire process tree on timeout (POSIX: detached group + `kill(-pid)`; Windows: `taskkill /T /F`).
- File: `src/runner/runInSandbox.ts`

4) Log stream resilience
- Prevents process crashes on log write errors; continues execution with `safeWrite` and error listener.
- File: `src/runner/runInSandbox.ts`
- Test: `tests/runner/logStream-error.test.ts`

5) Memory hygiene
- Adds TTL purge for `progressSessions` (completed sessions auto‑purge after TTL).
- File: `src/server.ts` (`PROGRESS_SESSION_TTL_MS`), Test: `tests/meta/progress-ttl.test.ts`

6) LLM resilience
- Retries transient errors with exponential backoff; telemetry `llm_retry` events.
- File: `src/llm/index.ts`, Test: `tests/llm/retry.test.ts`

7) Error surfacing improvements
- meta.testRuns entries include `errorMessage` from the runner so UI/users see real causes (e.g., compile or CLI errors) instead of only a later repair error.
- File: `src/server.ts`

8) Path traversal hardening
- Normalizes/decodes paths, forbids absolute/drive paths, rejects null bytes, ensures containment under project root.
- File: `src/executor/writeFiles.ts`, Tests: `tests/executor/writeFiles.security.test.ts`

9) Configurable plan duration
- `PLAN_MAX_DURATION_MS` environment variable to tune plan halt threshold (default remains 4 minutes).
- File: `src/planning/executeTaskPlan.ts`, Test: `tests/planning/executeTaskPlan.duration.test.ts`

10) Export normalization for generated apps (earlier step)
- Ensures `export default app` exists when only `export const app` is present.
- File: `src/utils/normalizeExports.ts` (already hooked into write flows), Tests: `tests/utils/normalizeExports.test.ts`

11) Dependency installer hardening (earlier step)
- Installs when declared deps are missing even if `node_modules` exists; `npm ci` → `npm install` fallback on lockfile mismatch (EUSAGE).
- File: `src/runner/installDeps.ts`, Tests: `tests/runner/installDeps.test.ts`

## Environment Variables (New/Relevant)
- `PROGRESS_SESSION_TTL_MS` — default 15 min.
- `PLAN_MAX_DURATION_MS` — default 240000 (4 min).
- `LLM_MAX_RETRIES` — default 3.
- `LLM_INITIAL_BACKOFF_MS` — default 1000.
- `LLM_MAX_BACKOFF_MS` — default 10000.
- `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — existing.

## Current Known Good State
- Tests: 55 files, 239 tests passing.
- Coverage: ~88.42% lines / ~81.36% branches (above thresholds).
- Contracts valid: `npm run contract:check` passes.
- SBOM generated: `sbom.spdx.json` present.

## How To Pick Up From Here (Step‑By‑Step)
1) Start server: `npm run dev`
2) Attempt a generation in the UI (or via `POST /api/execute`) with a small prompt.
3) If failure occurs, do NOT regenerate:
   - `GET /api/plan/<slug>/failed-subtasks`
   - `GET /api/fixtures/<slug>` → note `sessionId`
   - `POST /api/plan/<slug>/retest-subtask` → see error immediately
   - If repair necessary: `POST /api/replay/repair { project:"<slug>", sessionId:"<id>" }`
   - If a single step needs re‑applying: `POST /api/replay/subtask { project, sessionId, subtaskId }`
   - UI: open `/fixtures.html` for one‑click actions
4) After any fix, run the Validation Gate (see above) and attach references to this handoff or the tracking plan.

## Tracking Plan (Live)
- See: `.automation/reliability_hardening_plan.md` — contains checklist (C1–C3, P1–P8) with statuses, evidence, and next items.
- As of this handoff, P1–P8 are marked [x].

## File References (Key)
- Server & API: `src/server.ts`
- Planning core: `src/planning/executeTaskPlan.ts`, `src/planning/executeSubtask.ts`
- Runner: `src/runner/runInSandbox.ts`, `src/runner/installDeps.ts`, `src/runner/detectTestCommand.ts`
- Repair: `src/repair/multiTurnRepair.ts`, `src/repair/analyzeFailure.ts`, `src/repair/buildRepairPrompt.ts`
- Fixtures: `src/fixtures/index.ts`, `public/fixtures.html`, `public/fixtures.js`
- Security: `src/executor/writeFiles.ts`
- LLM layer: `src/llm/index.ts`, `src/llm/providers/*`
- Telemetry: `src/telemetry/events.ts`
- Tests: `tests/**/*`

## Suggested Next Enhancements (Optional)
- Add a “Debug / Fixtures” link to the main UI header for discoverability (points to `/fixtures.html`).
- Enrich error surfacing with an explicit `errorSummary` in meta; UI can prefer runner error when present.
- Consider per‑run directories (`output/<slug>/<runId>/`) for plan mode history while preserving the latest in `output/<slug>`.

## Security & Safety Notes
- Path traversal is now hardened; still validate any new write paths via the helper in `writeFiles.ts`.
- Timeout kill is more robust; if adding new runners, ensure they inherit group semantics.
- Do not reduce coverage/lint/type gates; CI assumes current thresholds.

## Quick API Cheat‑Sheet (curl)
- Retest only:
  ```bash
  curl -s -X POST localhost:3000/api/plan/<slug>/retest-subtask -H 'Content-Type: application/json' -d '{}'
  ```
- List fixtures:
  ```bash
  curl -s localhost:3000/api/fixtures/<slug> | jq
  ```
- Replay repair:
  ```bash
  curl -s -X POST localhost:3000/api/replay/repair -H 'Content-Type: application/json' \
       -d '{"project":"<slug>","sessionId":"<id>"}' | jq
  ```
- Replay subtask:
  ```bash
  curl -s -X POST localhost:3000/api/replay/subtask -H 'Content-Type: application/json' \
       -d '{"project":"<slug>","sessionId":"<id>","subtaskId":"<id>"}' | jq
  ```

## Ready For Handoff
- Everything you need is in this file and the tracking plan. Start the server, generate a small project, and if anything fails, use replay to inspect and fix without a full 10‑minute re‑run. Always run the Validation Gate before declaring success.

