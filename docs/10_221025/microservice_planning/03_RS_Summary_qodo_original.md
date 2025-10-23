# Research Summary (RS)

## Repository Situation Snapshot
- src/server.ts:L6, L67–L75 → Imports 10 domain routers: mountClarifyRoutes, mountProgressRoutes, mountExecuteRoutes, mountSessionsRoutes, mountRunnerRoutes, mountFixturesRoutes, mountReplayRoutes, mountPlanRoutes, mountStatusRoutes, mountFilesRoutes.
- src/server.ts:L1174–L1223, L1527 → All extracted routers mounted; no inline app.get/app.post route handlers remain except middleware/static mounts (see L1225–L1226).
- src/server.ts:L101–L109 → Problem details middleware and telemetry installed early in app bootstrap (maybeInitTelemetry(); installProblemDetails(app); cors/json/morgan).
- src/server.ts:L130–L156 → Shared in-memory state still in monolith: progressSessions Map and orchestrationSessions Map, with TTL constant.
- src/server.ts:L141–L156 → Orchestrator session lifecycle helpers remain in monolith: ensureOrchestrationSession, getOrchestrationSession, removeOrchestrationSession.
- src/server.ts:L158–L175, L177–L191 → State mapping helpers remain: mapStageToState, stateToStage.
- src/server.ts:L194–L201 → TTL cleanup: purgeExpiredProgressSessions retains session deletion coupling.
- src/server.ts:L203–L210 and through ~L242 → Core progress write path: setProgress drives OrchestratorStateMachine transitions and cleanup.
- src/server.ts:L255–L263 → getProgress read path composes from progressSessions and orchestrationSessions.
- src/server.ts:L323–L339 → snapshotFromSession uses ensureOrchestrationSession and current state.
- src/server.ts:L340–L363 → openProgressStream implements SSE progress emitter.
- src/domains/clarify/routes.ts:L9–L36 → Extracted /api/clarify handler using respondWithProblem and validators (no DI needed).
- src/domains/progress/routes.ts:L9–L32 → Extracted progress routes via DI: openProgressStream and getProgress injected from server.ts.
- src/domains/execute/routes.ts:L5–L9 → Extracted /api/execute handler via makeExecuteHandler with DI (setProgress, ensureOrchestrationSession, consumeClarificationQuestions, captureFixture, stepQueue) mounted in server.ts:L1175–L1198.
- src/domains/sessions/routes.ts:L1–L44 (file length 442) → Extracted pause/resume endpoints using wide DI surface (ensureOrchestrationSession, resumeFromCheckpoint, buildResumePrompts, stepQueue, etc.) mounted in server.ts:L1176–L1198.
- src/domains/runner/routes.ts:L19–L40 (file length 48) → Extracted /api/run-tests endpoint; DI: slugify, outputDir, runTests, logEvent. Mounted in server.ts:L1199–L1204.
- src/domains/fixtures/routes.ts:L8–L21 (file length 22) → Extracted /api/fixtures/:project; DI: slugify, listFixtures. Mounted in server.ts:L1205.
- src/domains/replay/routes.ts:L31–L40 (file length 107) → Extracted /api/replay/* (repair/subtask) with DI: readFixture, multiTurnRepair, writeFiles, ensureDefaultExportForApp, runTests, logEvent. Mounted in server.ts:L1206–L1215.
- src/domains/plan/routes.ts:L15–L40 (file length 66) → Extracted /api/plan/* helpers; DI: runTests/logEvent; filesystem reads; Mounted in server.ts:L1216–L1221.
- src/domains/status/routes.ts:L10–L29 (file length 29) → Extracted /healthz and /api/executions/:id; uses respondWithProblem and deps.getExecution. Mounted in server.ts:L1222.
- src/domains/files/routes.ts:L20–L75, L77–L115, L116–L206, L208–L277 (file length 278) → Extracted /output-archive, directory listing HTML, and /api/files content; DI: slugify, outputDir. Mounted in server.ts:L1223.
- src/server.ts:L1225–L1226 → Static mounts remain: app.use("/", express.static(...)); app.use("/output", express.static(...)).
- src/server.ts:L484, L580, L802 → Core execution functions still in monolith: createPlanExecutionContext, executePlanFlow, runSingleExecution.
- src/orchestrator/stateMachine.ts:L33–L43, L63–L82 → OrchestratorStateMachine definition and transition API (class used by server helpers).
- src/orchestrator/stepQueue.ts:L1–L381 → Workflow queue class StepQueue used in /api/execute and sessions resume flow (registered in server.ts before mounts).
- src/orchestrator/executionsStore.ts:L1–L152 → In-memory execution records store with create/get/update/fail/complete, used by status routes.
- src/middleware/problemDetails.ts:L36–L49, L81–L94, L102–L132 → RFC 9457 helpers and middleware: toProblem, problemDetailsEnabled(default-on in dev/test), respondWithProblem Content-Type set to application/problem+json; charset=utf-8.

## Execution Order & Status
- Completed (per docs): docs/10_221025/01_chat_log_where_we_are.md:L20–L43 indicates Sessions 1–3 route extractions done; domain routers exist for clarify, progress, execute, sessions, runner, fixtures, replay, plan, files, status. Evidence aligns with mounts in src/server.ts:L1174–L1223 and import lines L6, L67–L75.
- Contract sequence definition: docs/10_221025/01_chat_log_where_we_are.md:L3–L17 cites contracts/Roadmap_execution/21_phase21_modular_extraction_contract.json execution_order, matching order in that contract file’s "execution_order" array (see contracts/Roadmap_execution/21_phase21_modular_extraction_contract.json — execution_order block; entire file shows phases and gate steps).
- Next Gate: P21-GATE-S3 validation (lint, typecheck, tests) per docs/10_221025/01_chat_log_where_we_are.md:L45–L58 and contracts/Roadmap_execution/21_phase21_modular_extraction_contract.json actions list for id "P21-GATE-S3".

## Risk & Gap Audit
- Shared in-memory state blocks microservice boundaries — Evidence: progressSessions and orchestrationSessions in src/server.ts:L130–L139; state transitions coupled in setProgress src/server.ts:L203–L242; openProgressStream SSE emits from monolith src/server.ts:L340–L363. Standard: microservices emphasize service-local state and APIs; shared process memory couples modules, complicating decomposition [Fowler Microservices, 2014-03; OpenTelemetry Context Propagation, 2023-02].
- Business logic remains centralized in server.ts — Evidence: createPlanExecutionContext L484–L579, executePlanFlow L580–L801, runSingleExecution L802–L1158; StepQueue configured and handlers registered in-process; DI into routers but core logic not extracted. Standard: strangler pattern recommends moving logic behind service contracts incrementally [microservices.io Strangler Fig, 2023-06; O’Reilly Microservices Patterns, 2018].
- Non-production concerns:
  - Error envelopes: RFC 9457 middleware installed and used — Evidence: src/middleware/problemDetails.ts:L102–L132; used in domain handlers (e.g., src/domains/status/routes.ts:L16–L23). Standard: RFC 9457 Problem Details for HTTP APIs, 2023; OpenAPI 3.1.1 aligns with JSON Schema 2020-12 for error schema references [RFC 9457, 2023-11; OpenAPI 3.1.1, 2021-02].
  - Tracing: Optional OTEL init and graceful shutdown — Evidence: src/server.ts:L103–L108, L1529–L1547; see src/telemetry/otel.ts referenced throughout docs. Standard: OpenTelemetry Spec (Traces), 2023-05; Node.js SDK SIG.
  - AuthN/Z propagation: No service-to-service auth as there are no services yet; future risk when splitting. Standard: OWASP ASVS v5.0 sections on authentication, authorization, and API security, 2023-09.

## Assumptions
1) Microservice extraction will not introduce new npm dependencies initially; inter-service communication will use Node’s built-in https/http and existing utilities. Testable: grep package.json changes; run npm ci diff before/after.
2) Initial service-to-service authentication will be a bearer token via Authorization header configured by env (e.g., SERVICES_TOKEN), no new crypto or JWT libs. Testable: requests rejected without token in integration tests.
3) Service ports as follows unless conflicts arise: executor:3001, planning:3002, repair:3003, runner:3004, orchestrator:3005, llm-gateway:3006, clarification:3007, files/status:3008, ui:3000. Testable: docker-compose up; health checks.
4) Backward compatibility: monolith keeps existing routes and delegates to services when SERVICES_SPLIT=1; default remains monolith path. Testable: run tests with and without flag; routes behave identically.
5) Contracts (OpenAPI 3.1.1 + JSON Schema 2020-12) will be generated and validated in CI; no breaking changes to external API. Testable: npm run contract:check; diff OpenAPI before/after.

## Evidence Table
| Claim | Repo Evidence | External Standard |
|---|---|---|
| All 10 domain routers exist and are mounted | src/server.ts:L6, L67–L75 (imports), L1174–L1223, L1527 (mounts) | [OpenAPI 3.1.1, 2021-02] |
| Shared progress/orchestration state remains in monolith | src/server.ts:L130–L156, L194–L201, L203–L242, L255–L263, L340–L363 | [Fowler Microservices, 2014-03]; [microservices.io Strangler, 2023-06] |
| /healthz and /api/executions/:id extracted to status router | src/domains/status/routes.ts:L10–L29; mounted src/server.ts:L1222 | [RFC 9457, 2023-11] |
| Files/archive/listing/file-content extracted | src/domains/files/routes.ts:L20–L277; mounted src/server.ts:L1223 | [OWASP ASVS v5.0 (Input Validation), 2023-09] |
| Problem Details middleware installed and used | src/middleware/problemDetails.ts:L102–L132; server.ts:L103–L106 | [RFC 9457, 2023-11]; [OpenAPI 3.1.1, 2021-02] |
| Orchestrator queue and state machine live in repo | src/orchestrator/stepQueue.ts:L1–L381; src/orchestrator/stateMachine.ts:L33–L82 | [OpenTelemetry Traces Spec, 2023-05] |
| Execution store supports /api/executions/:id | src/orchestrator/executionsStore.ts:L1–L152 | [OpenAPI 3.1.1, 2021-02] |
| Phase 21 next gate is validation | docs/10_221025/01_chat_log_where_we_are.md:L45–L58; contracts/Roadmap_execution/21_phase21_modular_extraction_contract.json (P21-GATE-S3 actions) | — |

---

# Contract Plan (CP)

## Service Topology
- orchestrator
  - Owns: src/orchestrator/stateMachine.ts:L1–L86; src/orchestrator/stepQueue.ts:L1–L381; src/orchestrator/executionsStore.ts:L1–L152; src/orchestrator/abortSignal.ts:L38, L95; src/orchestrator/resume.ts:L1–L219; src/orchestrator/resumePrompt.ts:L88; src/orchestrator/checkpoints.ts (all).
  - Contract (OpenAPI outline): 
    - GET /v1/executions/{id}
    - POST /v1/sessions/{id}/pause
    - POST /v1/sessions/{id}/resume
    - GET /v1/progress/{sessionId} (snapshot)
    - GET /v1/progress/{sessionId}/stream (SSE)
    - Schemas: ExecutionRecord, ProgressSnapshot, PauseRequest, ResumeRequest, ProblemDetails (RFC 9457)
  - Dependencies: N/A initially; called by executor/sessions/progress gateways.
- executor
  - Owns: src/server.ts:L802–L1158 (runSingleExecution); src/server.ts:L484–L579 (createPlanExecutionContext); src/server.ts:L580–L801 (executePlanFlow); src/domains/execute/helpers.ts (entire file).
  - Contract:
    - POST /v1/execute (start execution; optional SSE upgrade)
    - GET /v1/executions/{id} (proxy to orchestrator until fully owned)
    - Schemas: ExecuteRequest, ExecuteResponse, ProblemDetails
  - Dependencies: orchestrator (session state, execution record), runner, planning, repair, files.
- sessions
  - Owns: src/domains/sessions/routes.ts:L1–L442 (DI currently), normalizeInterruptQuestions src/server.ts:L280–L321, normalizeResumeAnswers src/server.ts:L293–L321 (ownership shifts to orchestrator if preferred).
  - Contract:
    - POST /v1/sessions/{id}/pause
    - POST /v1/sessions/{id}/resume
    - Schemas: PauseRequest, ResumeRequest, ProblemDetails
  - Dependencies: orchestrator.
- progress
  - Owns: src/server.ts:L255–L263 (getProgress), L323–L339 (snapshotFromSession), L340–L363 (openProgressStream).
  - Contract:
    - GET /v1/progress/{sessionId}
    - GET /v1/progress/{sessionId}/stream
    - Schemas: ProgressSnapshot
  - Dependencies: orchestrator (session state).
- runner
  - Owns: src/runner/runInSandbox.ts:L1–L293; detectTestCommand.ts; installDeps.ts; runUIValidation.ts.
  - Contract:
    - POST /v1/run-tests
    - Schemas: RunInSandboxRequest, RunResult
  - Dependencies: none.
- planning
  - Owns: src/planning/decomposeTask.ts (entire file); executeTaskPlan.ts (entire file); generateSubtaskOutput.ts (entire file).
  - Contract:
    - POST /v1/plan/decompose
    - POST /v1/plan/execute
    - Schemas: TaskPlan, Subtask, PlanExecutionResult
  - Dependencies: runner, files.
- repair
  - Owns: src/repair/multiTurnRepair.ts; repairOnce.ts; analyzeFailure.ts; strategySelector.ts; generateDiff.ts.
  - Contract:
    - POST /v1/repair/multi-turn
    - POST /v1/repair/once
    - Schemas: RepairHistory, RepairAttempt, RunResult
  - Dependencies: runner.
- llm-gateway
  - Owns: src/llm/index.ts; providers/*; llm/trace.ts.
  - Contract:
    - POST /v1/llm/json
    - Schemas: LLMRequest, LLMResponse, ProblemDetails
  - Dependencies: telemetry.
- files-status
  - Owns: src/domains/files/routes.ts:L20–L277; src/domains/status/routes.ts:L10–L29.
  - Contract:
    - GET /v1/healthz
    - GET /v1/output-archive/{project}
    - GET /v1/output/{project}/{path}
    - GET /v1/files/{project}/{path}
    - Schemas: FileContent, DirectoryListing, ProblemDetails
  - Dependencies: none.

## Extraction Plan (Phases)

### Phase 1
Task 1.1 — Carve out Orchestrator state and APIs
- Move/Extract: 
  - From src/server.ts:L130–L156, L194–L201, L203–L242, L255–L263, L323–L363 → services/orchestrator/src/state.ts, progress.ts
  - From src/orchestrator/stateMachine.ts:L1–L86; src/orchestrator/stepQueue.ts:L1–L381; src/orchestrator/executionsStore.ts:L1–L152; src/orchestrator/abortSignal.ts:L38,L95; src/orchestrator/resume.ts:L1–L219; src/orchestrator/resumePrompt.ts:L88 → services/orchestrator/src/*
  - Resulting imports in monolith: replace direct calls with HTTP client to ORCHESTRATOR_URL when SERVICES_SPLIT=1, otherwise keep local code path.
- Interface: 
  - GET /v1/executions/{id}
  - POST /v1/sessions/{id}/pause
  - POST /v1/sessions/{id}/resume
  - GET /v1/progress/{sessionId}, GET /v1/progress/{sessionId}/stream
  - Schemas: ExecutionRecord, PauseRequest, ResumeRequest, ProgressSnapshot, ProblemDetails (RFC 9457, JSON Schema 2020-12)
- Runtime: 
  - Port 3005; env ORCHESTRATOR_URL=http://localhost:3005
  - Auth: Authorization: Bearer ${SERVICES_TOKEN} (env)
- Observability: 
  - OTel NodeSDK (enable via OTEL_ENABLED=1), logs in JSON, /healthz and /readyz.
- Compatibility: 
  - Monolith keeps existing routes; sessions/progress/status routers call orchestrator via client if SERVICES_SPLIT=1; fallback to local functions if unset.
- Rollback: 
  - Toggle SERVICES_SPLIT=0; revert imports to local functions; keep move in git branch to revert if needed (commit references documented in PR).

### Phase 2
Task 2.1 — Extract Runner service
- Move/Extract: src/runner/runInSandbox.ts:L1–L293 and runner helpers → services/runner/src/*
- Interface:
  - POST /v1/run-tests
  - Schema: RunInSandboxRequest, RunResult
- Runtime: Port 3004; RUNNER_URL
- Observability: OTel spans around spawn, metrics on exit code/latency; /healthz, /readyz.
- Compatibility: Monolith runner domain invokes HTTP client under flag.
- Rollback: Flip flag; restore local function path.

### Phase 3
Task 3.1 — Extract Planning service
- Move/Extract: src/planning/decomposeTask.ts, executeTaskPlan.ts, generateSubtaskOutput.ts → services/planning/src/*
- Interface:
  - POST /v1/plan/decompose, POST /v1/plan/execute
- Runtime: Port 3002; PLANNING_URL
- Observability: OTel spans for LLM interactions, /healthz/readyz.
- Compatibility: executor’s createPlanExecutionContext delegates to planning when split.
- Rollback: Toggle flag; restore local helpers.

### Phase 4
Task 4.1 — Extract Repair service
- Move/Extract: src/repair/*.ts → services/repair/src/*
- Interface:
  - POST /v1/repair/multi-turn, POST /v1/repair/once
- Runtime: Port 3003; REPAIR_URL
- Observability: OTel; /healthz/readyz.
- Compatibility: monolith calls repair API; fallback path retained.
- Rollback: Toggle flag.

### Phase 5
Task 5.1 — Extract LLM Gateway
- Move/Extract: src/llm/* → services/llm-gateway/src/*
- Interface:
  - POST /v1/llm/json
- Runtime: Port 3006; LLM_GATEWAY_URL
- Observability: OTel; /healthz/readyz.
- Compatibility: generateJSON uses gateway.
- Rollback: Toggle flag.

### Phase 6
Task 6.1 — Extract Files/Status service
- Move/Extract: src/domains/files/routes.ts:L20–L277; src/domains/status/routes.ts:L10–L29 → services/files-status/src/*
- Interface:
  - GET /v1/healthz, GET /v1/output-archive/{project}, GET /v1/output/{project}/*, GET /v1/files/{project}/{path}
- Runtime: Port 3008; FILES_URL
- Observability: basic metrics and logs; /healthz/readyz.
- Compatibility: Monolith proxies routes to service.
- Rollback: Toggle flag.

### Phase 7
Task 7.1 — Extract Executor gateway
- Move/Extract: src/domains/execute/routes.ts and services/execute.ts logic → services/executor/src/*
- Interface:
  - POST /v1/execute
- Runtime: Port 3001; EXECUTION_URL
- Observability: OTel; /healthz/readyz.
- Compatibility: Monolith route delegates to executor.
- Rollback: Toggle flag.

## Quality Gates
- Commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run contract:check
  - npm run sbom
  - npm run sbom:cyclonedx
  - npm run provenance
- Coverage: >= 80% line, >= 75% branch (as enforced in AGENTS.md).
- Container build: docker build -t executor-orchestrator ./services/orchestrator and analogous per service; docker compose up for local topology.
- Smoke checks:
  - curl -f http://localhost:3005/healthz
  - curl -f http://localhost:3001/v1/execute -X POST -H "Authorization: Bearer $SERVICES_TOKEN" -d '{ "prompt": "hello" }' -H "Content-Type: application/json"

## Change Impact Map
- Tests to add/update:
  - tests/microservices/orchestrator/orchestrator.contract.test.ts
  - tests/microservices/runner/runner.contract.test.ts
  - tests/microservices/planning/planning.contract.test.ts
  - tests/microservices/repair/repair.contract.test.ts
  - tests/microservices/llm-gateway/llm.contract.test.ts
  - tests/microservices/files-status/files.contract.test.ts
  - tests/microservices/executor/executor.contract.test.ts
  - Update existing domain tests to run under both paths: SERVICES_SPLIT=0/1 (add parametrized env to tests/domains/*).
  - Add integration tests for auth header enforcement between monolith and services.

## Evidence Table
| Claim | Repo Evidence | External Standard |
|---|---|---|
| Orchestrator owns machine, queue, execution store | src/orchestrator/stateMachine.ts:L1–L86; src/orchestrator/stepQueue.ts:L1–L381; src/orchestrator/executionsStore.ts:L1–L152 | [OpenAPI 3.1.1, 2021-02] |
| Monolith retains shared state to be extracted | src/server.ts:L130–L156, L194–L201, L203–L242, L255–L263, L340–L363 | [microservices.io Strangler, 2023-06] |
| Status and files routes currently exist as domain routers | src/domains/status/routes.ts:L10–L29; src/domains/files/routes.ts:L20–L277 | [OWASP ASVS v5.0, 2023-09] |
| Problem details used for errors | src/middleware/problemDetails.ts:L102–L132 | [RFC 9457, 2023-11]; [OpenAPI 3.1.1, 2021-02] |
| StepQueue workflows used in execute path | src/orchestrator/stepQueue.ts:L1–L381; registered in src/server.ts before mounts | [OpenTelemetry Traces, 2023-05] |

---

References (primary sources)
- RFC 9457: Problem Details for HTTP APIs, 2023-11 (IETF)
- OpenAPI 3.1.1, 2021-02 (OpenAPI Initiative)
- JSON Schema 2020-12, 2020-12 (JSON Schema)
- OWASP ASVS v5.0, 2023-09 (OWASP)
- OpenTelemetry Specification (Traces), 2023-05 (CNCF)
- Martin Fowler, Microservices, 2014-03; microservices.io Strangler Fig Pattern, 2023-06

Notes
- The plan uses strangler pattern to avoid downtime and to preserve existing API surface while incrementally introducing services.
- Service-to-service auth uses Authorization: Bearer with SERVICES_TOKEN; no new dependencies required, satisfying repository constraints.
- All gateway paths and error envelopes remain unchanged to meet “no breaking changes” constraint.
- The monolith will continue to run green gates (lint, typecheck, tests, contracts, SBOM, provenance) at each phase, and toggle-based rollback is defined.
