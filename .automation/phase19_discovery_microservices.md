# Phase 19 — Discovery Note (Monolith → Feature-flagged extraction)

Short, source-grounded inventory of integration points and safe migration boundaries.

## scope snapshot
- Server: `src/server.ts` (Express monolith) — routes and orchestration in-process
- Error envelopes: `src/middleware/problemDetails.ts` — RFC 9457, flag-aware
- Telemetry: `src/telemetry/otel.ts` (OTel, flag-aware), `src/telemetry/events.ts` (JSONL traces, dual-write flag)
- Orchestrator: state machine + step queue in-process under `src/orchestrator/*`
- Adapter (future): `src/orchestrator/adapter.ts` — stub, not wired

## verified integration points (±10 lines context)
- Health and executions status
  - `src/server.ts:447-468`
    - `/healthz` and `/api/executions/:id` with Problem Details on 404
- Output browsing + archive
  - `src/server.ts:461-707` — safe directory listing and archive endpoints
- Static assets
  - `src/server.ts:675-676` — `/` and `/output` static serving
- Clarification API
  - `src/server.ts:1542-1574` — `/api/clarify` + validation + Problem Details
- Execute API (primary seam)
  - `src/server.ts:1577-1846` — `/api/execute` runtime switch via `AGENTS_RUNTIME`, SSE only in stepqueue path; creates abort signals; orchestrates progress; relies on in-process planning/generation/test
- Test execution API
  - `src/server.ts:1873-1896` — `/api/run-tests` → sandbox runner + event log
- Fixtures and replay
  - `src/server.ts:1898-2047` — fixtures list, repair replay, subtask replay
- Plan helpers
  - `src/server.ts:1963-2000` — list failed subtasks; `:1984-1999` retest subtask
- Pause/Resume orchestration
  - `src/server.ts:2000-2102` pause, `:2103-2310` resume
- Progress
  - `src/server.ts:2310-2339` — SSE stream + JSON snapshot + legacy alias

## feature flags (verified in code)
- Problem Details envelopes: `src/middleware/problemDetails.ts` → `problemDetailsEnabled()` (default on in dev/test)
- OpenTelemetry: `src/telemetry/otel.ts` → `OTEL_ENABLED` truthy → init NodeSDK
- Action log dual-write: `src/telemetry/events.ts` → `ACTION_LOG_JSONL`
- Orchestrator runtime switch: `src/server.ts:1577-1600` (`AGENTS_RUNTIME=langgraph`), adapter stub in `src/orchestrator/adapter.ts`

## constraints check (ai-stack.json, repo rules)
- Language/stack: TypeScript/Node/Express only — OK
- Frontend: `/public` vanilla only — unaffected
- Tests: Vitest baseline must remain green — enforce at each step
- Lint: Zero warnings — enforce
- New deps: Avoid unless justified; start with HTTP-boundary extraction (no broker). Event bus later, subject to approval.

## proposed seams (stage 1: zero-dep boundaries)
- API Gateway remains `src/server.ts`; extract handlers behind interfaces:
  1) Execute service boundary: factor `/api/execute` into module `src/services/execute.ts` first, then optionally remote-call.
  2) Replay/fixtures boundary: factor `replay` and `fixtures` into `src/services/replay.ts` and `src/services/fixtures.ts`.
  3) Progress/session boundary: factor pause/resume/progress into `src/services/sessions.ts`.
- Keep feature flags:
  - Preserve `AGENTS_RUNTIME` switch; wire adapter call path via a thin client when flipped.
  - Keep Problem Details and OTel behavior unchanged.

## risk & impact (short)
- High blast radius around `/api/execute` (planning/generation/test). Mitigate via:
  - Pure refactor (move/no behavior change) + tests unmodified.
  - Keep SSE behavior identical when `AGENTS_RUNTIME=stepqueue`.
- Session state coupling (maps, machine) — expose via small service wrapper, don’t change data shape.

## next steps (minimal, test-first)
1) Create service modules with identical signatures; move code (no behavior change).
2) Replace route handlers to call modules; re-run validation task.
3) Add a thin adapter for `AGENTS_RUNTIME=langgraph` path calling `orchestrator/adapter.executeAdapter` behind feature flag (still stub-response today).

## appendix (source evidence)
- Adapter stub note: `src/orchestrator/adapter.ts` header comment — not wired by default
- OTel init: `src/server.ts:112-121` calls `maybeInitTelemetry()`; graceful shutdown: `src/server.ts:2366-2395`
- Problem Details install: `src/server.ts:112-121` calls `installProblemDetails(app)`
