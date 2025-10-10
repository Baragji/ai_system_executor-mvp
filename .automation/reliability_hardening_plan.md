# Reliability Hardening – Tracking Plan

Version: v0.1 • Date: 2025-10-09
Owner: @yousefbaragji • Maintainer: AI Executor Agent

Purpose
- Track stability fixes and validation for the Executor MVP.
- Execute one small, verifiable step at a time with evidence.
- Re-run only the failing part using fixtures/replay to keep feedback fast.

Validation Gate (run after every step)
- npm run lint
- npm run typecheck
- npm test
- npm run contract:check
- npm run sbom

Quick Debug (no regeneration)
- List failures: GET /api/plan/<project>/failed-subtasks
- List fixtures: GET /api/fixtures/<project>
- Retest only: POST /api/plan/<project>/retest-subtask { project }
- Replay repair: POST /api/replay/repair { project, sessionId }
- Replay subtask: POST /api/replay/subtask { project, sessionId, subtaskId }
- UI helper: /fixtures.html

Status Legend
- [ ] Pending • [~] In progress • [x] Done

Top-Level Tracking Checklist
- [x] C1 – Fixture capture + replay (test/repair/subtask) with UI helper
- [x] C2 – Export normalization for app default export
- [x] C3 – Dependency installer hardening (ci→install fallback; missing deps)
- [ ] P1 – ISSUE-009: Clean output directory or use unique run dir (determinism)
- [ ] P2 – ISSUE-010: Kill entire process tree on timeout (no orphans)
- [ ] P3 – ISSUE-004: Log stream error handling (prevent crash on I/O)
- [ ] P4 – ISSUE-001: TTL purge for progressSessions (memory leak)
- [ ] P5 – ISSUE-003: LLM retry/backoff with telemetry + env config
- [ ] P6 – ISSUE-002: Harden writeFiles against path traversal
- [ ] P7 – Error surfacing: prefer test runner error in meta over artifact error
- [ ] P8 – Configurable plan max duration (ENV), keep default conservative

Detailed Steps

C1 – Fixture capture + replay (Done)
- Changes: src/fixtures/*, capture hooks in server + executeSubtask, endpoints (/api/fixtures, /api/replay/*), /fixtures.html
- Tests: tests/utils/fixtures.test.ts, tests/api/fixtures-route.test.ts
- Evidence: All tests green; manual UI check at /fixtures.html
- Status: [x]

C2 – Export normalization (Done)
- Changes: src/utils/normalizeExports.ts + hooks after writes
- Tests: tests/utils/normalizeExports.test.ts
- Why: Fix default import mismatch (e.g., tests importing default app)
- Status: [x]

C3 – Installer hardening (Done)
- Changes: src/runner/installDeps.ts (deps-missing detection; ci→install fallback)
- Tests: tests/runner/installDeps.test.ts
- Why: Handle lockfile mismatch (EUSAGE) & added devDeps after node_modules
- Status: [x]

P1 – Clean output (ISSUE-009)
- Goal: Deterministic runs — no stale files when reusing slug.
- Plan: Clean targetRoot before writes (single path). For plan path, optionally write to output/<slug>/<runId> and set browse_url accordingly.
- Files: src/server.ts (write paths), tests/e2e/phase1.test.ts (update expectations if needed)
- Validate: Full gate + replay retest on an existing slug twice (no stale bleed)
- Status: [ ]

P2 – Process tree kill on timeout (ISSUE-010)
- Goal: Ensure timeouts terminate all descendants.
- Plan: spawn with detached on POSIX and kill -PID; Windows taskkill fallback; safe fallback to child.kill.
- Files: src/runner/runInSandbox.ts (+ helper), tests/runner/runInSandbox.integration.test.ts (long child)
- Validate: Integration test asserts no lingering processes/log appends post-timeout
- Status: [ ]

P3 – Log stream error handling (ISSUE-004)
- Goal: Prevent process crash on log stream errors; still return results.
- Plan: add error listener; wrap writes with safeWrite.
- Files: src/runner/runInSandbox.ts, tests to inject stream error
- Validate: Unit/integration — process doesn’t crash; result returned
- Status: [ ]

P4 – TTL purge for progressSessions (ISSUE-001)
- Goal: Avoid memory leak from long-lived session map.
- Plan: Add PROGRESS_SESSION_TTL_MS + purge on set; purge done sessions after TTL.
- Files: src/server.ts, add unit test
- Validate: Unit — completed sessions removed after TTL; no behavior regression
- Status: [ ]

P5 – LLM retry/backoff (ISSUE-003)
- Goal: Resilience to transient failures.
- Plan: Retry wrapper with exponential backoff; env-configurable; telemetry on retries.
- Files: src/llm/providers/*, optional src/utils/retry.ts; unit tests mocking failures
- Validate: Unit tests for 429/5xx/ECONNRESET; no retry on 4xx auth/invalid
- Status: [ ]

P6 – writeFiles traversal hardening (ISSUE-002)
- Goal: Prevent writes outside project root.
- Plan: Normalize + decode + ensure inside project; double-check post-join.
- Files: src/executor/writeFiles.ts; new security tests
- Validate: Security tests for encoded traversal, null bytes, absolute paths
- Status: [ ]

P7 – Error surfacing improvement
- Goal: Show the real test failure in meta (instead of later artifact error text).
- Plan: When runInSandbox returns, prefer its errorMessage in subtaskResult.testResult; keep repair error separately.
- Files: src/planning/executeSubtask.ts, src/server.ts (single path)
- Validate: Unit test asserting meta.testRuns includes runner error; UI shows actionable message
- Status: [ ]

P8 – Configurable plan duration
- Goal: Avoid premature halts; keep UI responsive.
- Plan: Make MAX_PLAN_DURATION_MS configurable (ENV), default 4–6 minutes.
- Files: src/planning/executeTaskPlan.ts; unit test for limit
- Validate: ENV override respected; default unchanged
- Status: [ ]

How to Update This File
- After completing a step, toggle its status to [x], paste a one-liner of evidence (file refs / test output), and record date.
- Always run the Validation Gate per step and paste any relevant log paths (output/<project>/logs/*).

Appendix – Fast Replay Protocol
1) Identify failing project: GET /api/plan/<project>/failed-subtasks
2) List fixtures: GET /api/fixtures/<project> (grab sessionId)
3) Retest: POST /api/plan/<project>/retest-subtask { project }
4) Replay repair: POST /api/replay/repair { project, sessionId }
5) Replay subtask: POST /api/replay/subtask { project, sessionId, subtaskId }

