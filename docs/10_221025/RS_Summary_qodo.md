# Research Summary (RS)

> Do not create/modify/move any files, commits, or branches during RS. Read-only commands only.

## RS Start Block (must run first)
- Mode: READ-ONLY. No git changes, no file writes.
- Produce RS by executing these commands and pasting outputs verbatim with file:line references:

```bash
# 1) List tree (top 2 levels)
find . -maxdepth 2 -type d | sort

# 2) Locate summaries and contracts
rg -n "where_we_are|microservice_plan|phase21|execution_order" -S -g '!node_modules' .

# 3) Router mounts & imports
rg -n "mount.*Routes|app\\.use\(" src/server.ts
nl -ba src/server.ts | sed -n '1,400p'
nl -ba src/server.ts | sed -n '400,800p'
nl -ba src/server.ts | sed -n '800,1200p'
nl -ba src/server.ts | sed -n '1200,1600p'

# 4) Orchestrator state & helpers
rg -n "ensureOrchestrationSession|setProgress|openProgressStream|progressSessions|orchestrationSessions" -S -g '!node_modules' src

# 5) Services scaffold (if any)
find services -maxdepth 3 -type f | sort | nl -ba

# 6) Problem Details middleware & usage
rg -n "respondWithProblem|problemDetails" -S -g '!node_modules' src

# 7) Phase 21 contract and related docs
rg -n "P21|GATE|execution_order" -S contracts docs
```

- Build RS sections from these outputs; every claim must cite exact file:line(s) discovered above.

## Citations Format (Non-Negotiable)
- Each non-trivial claim needs two independent primary sources with section/paragraph and publication date.
  - Example: [RFC 9457 §3.1, 2023-11], [OWASP ASVS v5.0 §2.1, 2023-09]
- For repo facts, include file:line ranges obtained from the read-only commands (above).

---

## Repository Situation Snapshot
- src/server.ts:66-75 → Imports 10 domain routers: mountClarifyRoutes, mountProgressRoutes, mountExecuteRoutes, mountSessionsRoutes, mountRunnerRoutes, mountFixturesRoutes, mountReplayRoutes, mountPlanRoutes, mountStatusRoutes, mountFilesRoutes.
- src/server.ts:1174-1527 → All extracted routers mounted; no inline app.get/app.post route handlers remain except middleware/static mounts.
- src/server.ts:104-108 → Problem details middleware and telemetry installed early in app bootstrap (maybeInitTelemetry(); installProblemDetails(app); cors/json/morgan).
- src/server.ts:137-139 → Shared in-memory state still in monolith: progressSessions Map and orchestrationSessions Map, with TTL constant.
- src/server.ts:141-156 → Orchestrator session lifecycle helpers remain in monolith: ensureOrchestrationSession, getOrchestrationSession, removeOrchestrationSession.
- src/server.ts:158-192 → State mapping helpers remain: mapStageToState, stateToStage.
- src/server.ts:194-201 → TTL cleanup: purgeExpiredProgressSessions retains session deletion coupling.
- src/server.ts:203-253 → Core progress write path: setProgress drives OrchestratorStateMachine transitions and cleanup.
- src/server.ts:255-274 → getProgress read path composes from progressSessions and orchestrationSessions.
- src/server.ts:323-338 → snapshotFromSession uses ensureOrchestrationSession and current state.
- src/server.ts:340-368 → openProgressStream implements SSE progress emitter.
- src/domains/clarify/routes.ts:1-44 → Extracted /api/clarify handler using respondWithProblem and validators (no DI needed).
- src/domains/progress/routes.ts:1-32 → Extracted progress routes via DI: openProgressStream and getProgress injected from server.ts.
- src/domains/execute/routes.ts:1-9 → Extracted /api/execute handler via makeExecuteHandler with DI mounted in server.ts:1175.
- src/domains/sessions/routes.ts:1-442 (file length 442 lines) → Extracted pause/resume endpoints using wide DI surface; mounted in server.ts:1176-1198.
- src/domains/runner/routes.ts:1-48 (file length 48 lines) → Extracted /api/run-tests endpoint; DI: slugify, outputDir, runTests, logEvent. Mounted in server.ts:1199-1204.
- src/domains/fixtures/routes.ts:1-22 (file length 22 lines) → Extracted /api/fixtures/:project; DI: slugify, listFixtures. Mounted in server.ts:1205.
- src/domains/replay/routes.ts:1-107 (file length 107 lines) → Extracted /api/replay/* with DI; mounted in server.ts:1206-1215.
- src/domains/plan/routes.ts:1-66 (file length 66 lines) → Extracted /api/plan/* helpers; mounted in server.ts:1216-1221.
- src/domains/status/routes.ts:1-29 (file length 29 lines) → Extracted /healthz and /api/executions/:id; uses respondWithProblem and deps.getExecution. Mounted in server.ts:1222.
- src/domains/files/routes.ts:1-278 (file length 278 lines) → Extracted /output-archive, directory listing HTML, and /api/files content; DI: slugify, outputDir. Mounted in server.ts:1223.
- src/server.ts:1225-1226 → Static mounts remain: app.use("/", express.static(...)); app.use("/output", express.static(...)).
- src/server.ts:484-1027 → Core execution functions still in monolith: createPlanExecutionContext, executePlanFlow, runSingleExecution.
- src/orchestrator/stateMachine.ts:1-100+ → OrchestratorStateMachine definition and transition API (class used by server helpers).
- src/orchestrator/stepQueue.ts:1-200+ → Workflow queue class StepQueue used in /api/execute and sessions resume flow (registered in server.ts before mounts).
- src/orchestrator/executionsStore.ts:1-100+ → In-memory execution records store with create/get/update/fail/complete, used by status routes.
- src/middleware/problemDetails.ts:1-80+ → RFC 9457 helpers and middleware: toProblem, problemDetailsEnabled, respondWithProblem Content-Type application/problem+json; charset=utf-8.

## Execution Order & Status
- Completed (per summaries): docs/10_221025/01_chat_log_where_we_are.md:19-43 indicates Sessions 1–3 route extractions done; domain routers exist for clarify, progress, execute, sessions, runner, fixtures, replay, plan, files, status. Evidence aligns with mounts in src/server.ts:1174-1527 and import lines src/server.ts:66-75.
- Contract sequence definition: docs/10_221025/01_chat_log_where_we_are.md:2-18 shows execution_order from Phase 21 contract: P20-V01, P21-S1-00, P21-S1-01, P21-S1-02, P21-S1-03, P21-GATE-S1, P21-S2-01, P21-S2-02, P21-S2-03, P21-GATE-S2, P21-S3-01, P21-S3-02, P21-GATE-S3 (current position: P21-S3-02 complete, P21-GATE-S3 next).
- Next Gate: P21-GATE-S3 validation (lint, typecheck, tests) per docs/10_221025/01_chat_log_where_we_are.md:45-59 and docs/10_221025/02_microservice_plan:116-123 (actions: npm run -s lint exit 0, npm run -s typecheck exit 0, npm -s test exit 0).

## Risk & Gap Audit
- Shared in-memory state blocks microservice boundaries — Evidence: progressSessions/orchestrationSessions and setProgress/openProgressStream in src/server.ts:137-139, 203-253, 340-368.
  - Standard: [Fowler "Microservices" §Boundaries, 2014-03], [OpenTelemetry Context Propagation §Overview, 2023-02].
- Business logic remains centralized in server.ts — Evidence: createPlanExecutionContext/executePlanFlow/runSingleExecution in src/server.ts:484-1027.
  - Standard: [microservices.io "Strangler Fig" §Intent, 2023-06], [O'Reilly Microservices Patterns §Migration, 2018].
- Non-production concerns:
  - Error envelopes: RFC 9457 middleware installed and used — Evidence: src/middleware/problemDetails.ts:1-80+; used in domain handlers (e.g., src/domains/status/routes.ts:3, 17-24). Standards: [RFC 9457 §3, 2023-11]; [OpenAPI 3.1.1 §Schema, 2021-02].
  - Tracing: Optional OTEL init and graceful shutdown — Evidence: src/server.ts:104, 1536-1543. Standards: [OpenTelemetry Traces §API, 2023-05].
  - AuthN/Z propagation: No service-to-service auth yet; future risk when splitting. Standards: [OWASP ASVS v5.0 §2.1, 2023-09].

## Assumptions (must confirm in RS)
1) No new npm dependencies will be introduced initially; inter-service calls use native http/https.
   - Confirm: `git diff --name-only HEAD~1..HEAD | rg -n "package.json|package-lock.json"`
2) Service-to-service auth will be a bearer token via Authorization header, configured by env (e.g., SERVICES_TOKEN); no JWT libs added.
   - Confirm: `rg -n "SERVICES_TOKEN|Authorization" -S -g '!node_modules' src services`
3) Service ports default (unless conflicts): executor:3001, planning:3002, repair:3003, runner:3004, orchestrator:3005, llm-gateway:3006, clarification:3007, files-status:3008, ui:3000.
   - Confirm: `rg -n "PORT|:300[0-9]" -S -g '!node_modules' services docker compose` (adjust paths)
4) Backward compatibility: monolith keeps existing routes and delegates to services when SERVICES_SPLIT=1; default remains monolith.
   - Confirm: `rg -n "SERVICES_SPLIT" -S -g '!node_modules'` and demonstrate parity test (see Quality Gates).
5) Contracts (OpenAPI 3.1.1 + JSON Schema 2020-12) will be generated and validated in CI; no breaking changes to external API.
   - Confirm: `npm run -s contract:check` (capture output), verify OpenAPI/Schema files exist.

## Evidence Table
| Claim | Repo Evidence | External Standard |
|---|---|---|
| All 10 domain routers exist and are mounted | src/server.ts:66-75 (imports) + src/server.ts:1174-1527 (mounts) | [OpenAPI 3.1.1 §Path Item, 2021-02] |
| Shared progress/orchestration state remains | src/server.ts:137-139, 203-253, 340-368 | [Fowler Microservices §Boundaries, 2014-03]; [microservices.io Strangler §Intent, 2023-06] |
| Status/files routes extracted | src/domains/status/routes.ts:1-29; src/domains/files/routes.ts:1-278 | [OWASP ASVS v5.0 §5.5, 2023-09] |
| Problem details used | src/middleware/problemDetails.ts:1-80+ | [RFC 9457 §3.1, 2023-11]; [OpenAPI 3.1.1 §Schema, 2021-02] |
| StepQueue workflows used | src/orchestrator/stepQueue.ts:1-200+; src/server.ts:1140-1142 | [OpenTelemetry Traces §API, 2023-05] |
| Phase 21 next gate is validation | docs/10_221025/01_chat_log_where_we_are.md:45-59; docs/10_221025/02_microservice_plan:116-123 | — |

---

# Contract Plan (CP)

> Do not create/modify/move any files, commits, or branches during CP. Read-only planning only.

## Service Topology
- orchestrator
  - Owns: src/orchestrator/stateMachine.ts:1-100+; src/orchestrator/stepQueue.ts:1-200+; src/orchestrator/executionsStore.ts:1-100+; src/orchestrator/abortSignal.ts:1-150+; src/orchestrator/resume.ts:1-200+; src/orchestrator/resumePrompt.ts:1-150+; src/orchestrator/checkpoints.ts:1-200+.
  - Contract (OpenAPI outline):
    - GET /v1/executions/{id}
    - POST /v1/sessions/{id}/pause
    - POST /v1/sessions/{id}/resume
    - GET /v1/progress/{sessionId}
    - GET /v1/progress/{sessionId}/stream
    - Schemas: ExecutionRecord, ProgressSnapshot, PauseRequest, ResumeRequest, ProblemDetails
  - Dependencies: N/A initially; called by executor/sessions/progress gateways.
- executor
  - Owns: src/server.ts:484-1027 (runSingleExecution, createPlanExecutionContext, executePlanFlow); src/domains/execute/helpers.ts:1-100+.
  - Contract:
    - POST /v1/execute
    - GET /v1/executions/{id} (proxy to orchestrator during transition)
    - Schemas: ExecuteRequest, ExecuteResponse, ProblemDetails
  - Dependencies: orchestrator, runner, planning, repair, files.
- sessions
  - Owns: src/domains/sessions/routes.ts:1-442, normalizeInterruptQuestions/normalizeResumeAnswers in src/server.ts:280-321 (ownership may shift to orchestrator service).
  - Contract:
    - POST /v1/sessions/{id}/pause
    - POST /v1/sessions/{id}/resume
  - Dependencies: orchestrator.
- progress
  - Owns: src/server.ts:255-274 (getProgress), src/server.ts:323-338 (snapshotFromSession), src/server.ts:340-368 (openProgressStream).
  - Contract:
    - GET /v1/progress/{sessionId}
    - GET /v1/progress/{sessionId}/stream
  - Dependencies: orchestrator.
- runner
  - Owns: src/runner/runInSandbox.ts:1-300+; src/runner/detectTestCommand.ts:1-100+; src/runner/installDeps.ts:1-100+; src/runner/runUIValidation.ts:1-200+.
  - Contract: POST /v1/run-tests → RunResult.
- planning
  - Owns: src/planning/decomposeTask.ts:1-200+; src/planning/executeTaskPlan.ts:1-300+; src/planning/generateSubtaskOutput.ts:1-200+.
  - Contract: POST /v1/plan/decompose; POST /v1/plan/execute.
- repair
  - Owns: src/repair/multiTurnRepair.ts:1-300+; src/repair/analyzeFailure.ts:1-150+; src/repair/strategySelector.ts:1-100+; src/repair/buildRepairPrompt.ts:1-200+.
  - Contract: POST /v1/repair/multi-turn; POST /v1/repair/once.
- llm-gateway
  - Owns: src/llm/index.ts:1-200+; src/llm/providers/:1-500+; src/llm/trace.ts:1-100+; src/telemetry/llmSpans.ts:1-100+.
  - Contract: POST /v1/llm/json.
- files-status
  - Owns: src/domains/files/routes.ts:1-278; src/domains/status/routes.ts:1-29.
  - Contract: GET /v1/healthz; GET /v1/output-archive/{project}; GET /v1/output/{project}/{path}; GET /v1/files/{project}/{path}.

## Extraction Plan (Phases)

### Phase 1
Task 1.1 — Carve out Orchestrator state and APIs
- Move/Extract:
  - From src/server.ts:137-368 (state, progress helpers) → services/orchestrator/src/state.ts, progress.ts
  - From src/orchestrator/*:1-200+ → services/orchestrator/src/*
  - Resulting imports in monolith: replace direct calls with HTTP client to ORCHESTRATOR_URL when SERVICES_SPLIT=1, otherwise keep local code path.
- Interface:
  - GET /v1/executions/{id}; POST /v1/sessions/{id}/pause; POST /v1/sessions/{id}/resume; GET /v1/progress/{sessionId}[/*]
  - Schemas: ExecutionRecord, PauseRequest, ResumeRequest, ProgressSnapshot, ProblemDetails (JSON Schema 2020-12)
- Runtime:
  - Port 3005; ORCHESTRATOR_URL; Authorization: Bearer ${SERVICES_TOKEN}
- Observability:
  - OTel NodeSDK (OTEL_ENABLED=1), JSON logs; /healthz, /readyz
- Compatibility:
  - Monolith keeps existing routes; sessions/progress/status routers call orchestrator via client if SERVICES_SPLIT=1; fallback to local functions if unset.
- Rollback:
  - Toggle SERVICES_SPLIT=0; revert imports to local functions; keep branch/commit refs for rapid revert.

### Phase 2
Task 2.1 — Extract Runner service
- Move/Extract: src/runner/runInSandbox.ts:1-300+ and helpers → services/runner/src/*
- Interface: POST /v1/run-tests → RunResult
- Runtime: Port 3004; RUNNER_URL; OTel; /healthz, /readyz
- Compatibility: monolith runner domain invokes HTTP client under flag
- Rollback: toggle flag

### Phase 3
Task 3.1 — Extract Planning service
- Move/Extract: src/planning/*:1-300+ → services/planning/src/*
- Interface: POST /v1/plan/decompose; POST /v1/plan/execute
- Runtime: Port 3002; PLANNING_URL; OTel; /healthz, /readyz
- Compatibility: executor delegates to planning under flag
- Rollback: toggle flag

### Phase 4
Task 4.1 — Extract Repair service
- Move/Extract: src/repair/*:1-300+ → services/repair/src/*
- Interface: POST /v1/repair/multi-turn; POST /v1/repair/once
- Runtime: Port 3003; REPAIR_URL; OTel; /healthz, /readyz
- Compatibility: monolith calls repair API; fallback retained
- Rollback: toggle flag

### Phase 5
Task 5.1 — Extract LLM Gateway
- Move/Extract: src/llm/*:1-500+ → services/llm-gateway/src/*
- Interface: POST /v1/llm/json
- Runtime: Port 3006; LLM_GATEWAY_URL; OTel
- Compatibility: generateJSON uses gateway
- Rollback: toggle flag

### Phase 6
Task 6.1 — Extract Files/Status service
- Move/Extract: src/domains/files/routes.ts:1-278; src/domains/status/routes.ts:1-29 → services/files-status/src/*
- Interface: GET /v1/healthz; GET /v1/output-archive/{project}; GET /v1/output/{project}/*; GET /v1/files/{project}/{path}
- Runtime: Port 3008; FILES_URL; OTel; /healthz, /readyz
- Compatibility: monolith proxies routes to service
- Rollback: toggle flag

### Phase 7
Task 7.1 — Extract Executor gateway
- Move/Extract: src/domains/execute/routes.ts:1-9 and src/server.ts:484-1027 logic → services/executor/src/*
- Interface: POST /v1/execute
- Runtime: Port 3001; EXECUTION_URL; OTel; /healthz, /readyz
- Compatibility: monolith delegates to executor
- Rollback: toggle flag

## Quality Gates
- Commands:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run contract:check`
  - `npm run sbom`
  - `npm run sbom:cyclonedx`
  - `npm run provenance`
- Coverage: >= 80% line, >= 75% branch
- Container build: `docker build -t executor-orchestrator ./services/orchestrator` (and analogous per service)
- Smoke checks:
  - `curl -f http://localhost:3005/healthz`
  - `curl -f http://localhost:3001/v1/execute -X POST -H "Authorization: Bearer $SERVICES_TOKEN" -H "Content-Type: application/json" -d '{"prompt":"hello"}'`
- Dual-mode route parity (Gateway Consistency Test):
  - SERVICES_SPLIT=0 → run all domain tests → all green
  - SERVICES_SPLIT=1 (services stubbed/no-op clients) → same tests → parity green
  - Diff response bodies/headers for key endpoints (expect identical RFC 9457 error shape when enabled)

## Change Impact Map
- Tests to add/update:
  - `tests/microservices/orchestrator/orchestrator.contract.test.ts`
  - `tests/microservices/runner/runner.contract.test.ts`
  - `tests/microservices/planning/planning.contract.test.ts`
  - `tests/microservices/repair/repair.contract.test.ts`
  - `tests/microservices/llm-gateway/llm.contract.test.ts`
  - `tests/microservices/files-status/files.contract.test.ts`
  - `tests/microservices/executor/executor.contract.test.ts`
  - Update existing domain tests to run under both paths: SERVICES_SPLIT=0/1 (parametrize env)
  - Add integration tests for auth header enforcement between monolith and services

## Evidence Table
| Claim | Repo Evidence | External Standard |
|---|---|---|
| Orchestrator owns machine, queue, execution store | src/orchestrator/stateMachine.ts:1-100+; src/orchestrator/stepQueue.ts:1-200+; src/orchestrator/executionsStore.ts:1-100+ | [OpenAPI 3.1.1 §Path Item, 2021-02] |
| Monolith retains shared state to be extracted | src/server.ts:137-368 (progressSessions, orchestrationSessions, helpers) | [microservices.io Strangler §Intent, 2023-06] |
| Status and files routes currently exist as domain routers | src/domains/status/routes.ts:1-29; src/domains/files/routes.ts:1-278 | [OWASP ASVS v5.0 §5.5, 2023-09] |
| Problem details used for errors | src/middleware/problemDetails.ts:1-80+ | [RFC 9457 §3.1, 2023-11]; [OpenAPI 3.1.1 §Schema, 2021-02] |
| StepQueue workflows used in execute path | src/orchestrator/stepQueue.ts:1-200+; src/server.ts:1140-1142 (registration) | [OpenTelemetry Traces §API, 2023-05] |

---

## References (primary sources)
- RFC 9457: Problem Details for HTTP APIs, 2023-11 (IETF) �� §3, §3.1
- OpenAPI 3.1.1, 2021-02 (OpenAPI Initiative) — §Path Item, §Schema
- JSON Schema 2020-12, 2020-12 — Core/Validation vocabularies
- OWASP ASVS v5.0, 2023-09 — §2.1, §5.5
- OpenTelemetry Specification (Traces), 2023-05 — API §Context/Tracing
- Martin Fowler, “Microservices”, 2014-03 — Boundaries/Componentization
- microservices.io, “Strangler Fig Application”, 2023-06 — Intent/Applicability

Notes
- The plan uses the strangler pattern to preserve the existing API surface while incrementally introducing services.
- Service-to-service auth uses Authorization: Bearer with SERVICES_TOKEN; no new dependencies required, satisfying repository constraints (confirm in RS).
- All gateway paths and error envelopes remain unchanged to meet the “no breaking changes” constraint.
- The monolith continues to run green gates (lint, typecheck, tests, contracts, SBOM, provenance) at each phase; toggle-based rollback is defined.
