# Microservice Refactoring Plan v1.0

**Status:** ALL TESTS GREEN ✅  
**Evidence:** 498 tests passing, 3 skipped | Coverage: 82.17% / 75.52% (meets thresholds)  
**Date:** 2025-01-25  
**Monolith LOC:** src/server.ts = 1572 lines  

---

## 🎯 Mission

Extract 7 microservices from the monolith **WITHOUT BREAKING ANYTHING**. Every phase must maintain 100% behavioral parity and pass all 8 validation gates.

---

## 📋 Validation Gates (The 8 Commandments)

**ALL gates must be GREEN before AND after EVERY phase. No exceptions.**

```bash
# G1: Lint (zero warnings, zero errors)
npm run -s lint

# G2: TypeScript (zero errors)
npm run -s typecheck

# G3: Tests (498+ passing, coverage ≥80% line / ≥75% branch)
npm -s test

# G4: Contracts (schema validation passes)
npm run contract:check

# G5: Build (successful compilation)
npm run build

# G6a: SPDX SBOM (supply chain bill of materials)
npm run sbom

# G6b: CycloneDX SBOM
npm run sbom:cyclonedx

# G7: SLSA Provenance
npm run provenance
```

**Halt Conditions:**
- Any gate exits non-zero
- Coverage drops below 80% line or 75% branch
- Any new lint warning
- Any TypeScript error
- Any test failure

---

## 🧬 Evidence-Based Pattern (Proven in S1-S3)

### What Works (Backed by 10+ Successful Extractions)

**Evidence:** Sessions S1, S2-03, S3-01, S3-02 completed with ZERO failures

| Pattern | Evidence | Outcome |
|---------|----------|---------|
| **Anchor-First Discovery** | Find exact line numbers before touching code | No drift, no guesswork |
| **Typed DI Surface** | Export deps interfaces with full TypeScript types | No runtime surprises |
| **1:1 Behavior Preservation** | Keep paths, payloads, status codes identical | No API breaks |
| **Incremental Execution** | ONE service per session | Easy rollback, clear blame |
| **8-Gate Validation** | Run before + after | Catch breaks immediately |
| **100% Test Coverage** | New modules must be fully tested | No untested code ships |
| **Feature Flag Rollback** | `SERVICES_SPLIT=0` reverts to monolith | Instant safety net |

**Failure Rate:** 0% (all sessions delivered green)  
**Standards Alignment:** Strangler Fig (Fowler), Feature Toggles, Branch-by-Abstraction  
**Refs:** martinfowler.com/bliki/StranglerFigApplication.html, AWS Prescriptive Guidance Strangler Fig Pattern

---

## 🗺️ Phase-by-Phase Roadmap

### Current State Analysis

**Evidence from src/server.ts:**
```
L1-L100:   Imports, app bootstrap, middleware
L101-L109: Problem details + telemetry init
L130-L156: In-memory state: progressSessions, orchestrationSessions Maps
L158-L242: State helpers: setProgress, getProgress, mapStageToState, purge TTL
L255-L363: Progress read/SSE: getProgress, snapshotFromSession, openProgressStream
L484-L579: createPlanExecutionContext (planning logic)
L580-L801: executePlanFlow (subtask execution orchestration)
L802-L1158: runSingleExecution (single execution flow)
L1174-L1223: Mount 10 domain routers (all routes extracted to src/domains/*)
L1225-L1226: Static file serving
L1527: mountProgressRoutes (late mount)
```

**Still in Monolith (~33 helper functions):**
- Orchestration state (progressSessions, orchestrationSessions)
- State machine transitions (setProgress → OrchestratorStateMachine)
- SSE progress stream (openProgressStream)
- Execution orchestration (createPlanExecutionContext, executePlanFlow, runSingleExecution)
- Commented-out old routes (L1231+)

---

### Phase 1: Orchestrator Service

**Priority:** HIGHEST (Core state dependency for all other services)

#### Scope
Extract orchestration state, session management, and progress tracking into standalone service.

#### Files & Line Ranges to Move

**From src/server.ts:**
```
L130-L156   → services/orchestrator/src/state/sessionStore.ts
            (progressSessions, orchestrationSessions, TTL constants)

L158-L175   → services/orchestrator/src/state/stateMapper.ts
            (mapStageToState, stateToStage)

L177-L191   → services/orchestrator/src/state/stateMapper.ts
            (stateToStage implementation)

L194-L201   → services/orchestrator/src/state/ttl.ts
            (purgeExpiredProgressSessions)

L203-L242   → services/orchestrator/src/progress/setProgress.ts
            (setProgress with state machine transitions)

L255-L263   → services/orchestrator/src/progress/getProgress.ts
            (getProgress read path)

L323-L339   → services/orchestrator/src/progress/snapshot.ts
            (snapshotFromSession)

L340-L363   → services/orchestrator/src/progress/stream.ts
            (openProgressStream SSE implementation)
```

**From src/orchestrator/ (entire modules):**
```
src/orchestrator/stateMachine.ts:L1-L86        → services/orchestrator/src/machine/stateMachine.ts
src/orchestrator/stepQueue.ts:L1-L381         → services/orchestrator/src/queue/stepQueue.ts
src/orchestrator/executionsStore.ts:L1-L152   → services/orchestrator/src/executions/store.ts
src/orchestrator/abortSignal.ts:L38,L95       → services/orchestrator/src/signals/abortSignal.ts
src/orchestrator/resume.ts:L1-L219            → services/orchestrator/src/resume/resumeHandler.ts
src/orchestrator/resumePrompt.ts:L88          → services/orchestrator/src/resume/promptBuilder.ts
src/orchestrator/checkpoints.ts (all)         → services/orchestrator/src/checkpoints/checkpointStore.ts
src/orchestrator/interrupts.ts (all)          → services/orchestrator/src/interrupts/interruptHandler.ts
src/orchestrator/workspaceManifest.ts (all)   → services/orchestrator/src/workspace/manifestManager.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/orchestrator`  
**Port:** 3005  
**Env:** `ORCHESTRATOR_URL=http://localhost:3005`  
**Auth:** `Authorization: Bearer ${SERVICES_TOKEN}`

**Endpoints:**
```typescript
// Execution Records
GET    /v1/executions/:id              → ExecutionRecord
POST   /v1/executions                  → { id, sessionId }

// Sessions
POST   /v1/sessions/:id/pause          → { paused: true }
POST   /v1/sessions/:id/resume         → { resumed: true }
GET    /v1/sessions/:id                → SessionSnapshot

// Progress
GET    /v1/progress/:sessionId          → ProgressSnapshot (JSON)
GET    /v1/progress/:sessionId/stream   → SSE stream

// Health
GET    /healthz                         → 200 { ok: true }
GET    /readyz                          → 200 { ok: true }
```

**Schemas (JSON Schema 2020-12 + OpenAPI 3.1.1):**
```typescript
ExecutionRecord: { id, sessionId, state, createdAt, updatedAt }
SessionSnapshot: { sessionId, state, paused, questions, updatedAt }
ProgressSnapshot: { stage, progress, data, updatedAt, done, state, paused }
PauseRequest: { sessionId, questions }
ResumeRequest: { sessionId, answers }
ProblemDetails: RFC 9457 format
```

#### Monolith Adapter (Feature Flag)

**File:** `src/server.ts` (after extraction)

```typescript
// Replace direct calls with HTTP client when SERVICES_SPLIT=1

const SERVICES_SPLIT = process.env.SERVICES_SPLIT === "1";
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:3005";

function setProgress(...args) {
  if (SERVICES_SPLIT) {
    return orchestratorClient.setProgress(...args);
  }
  // Original logic (kept for rollback)
  return localSetProgress(...args);
}

// Repeat for: getProgress, ensureOrchestrationSession, etc.
```

#### DI Surface

```typescript
// services/orchestrator/src/types/deps.ts
export type OrchestratorDeps = {
  // Minimal; orchestrator is core, doesn't depend on domain services yet
  logEvent?: (type: string, data: Record<string, unknown>) => Promise<void>;
};
```

#### Tests

**Required:**
- `services/orchestrator/tests/state/sessionStore.test.ts` (100% coverage)
- `services/orchestrator/tests/progress/setProgress.test.ts` (all state transitions)
- `services/orchestrator/tests/progress/stream.test.ts` (SSE events)
- `services/orchestrator/tests/api/executions.test.ts` (200, 404 status codes)
- `services/orchestrator/tests/api/sessions.test.ts` (pause/resume flows)
- Integration test in monolith: `tests/integration/orchestrator-service.test.ts` (SERVICES_SPLIT=1 vs =0 parity)

**Coverage Requirement:** 100% for services/orchestrator/src/, ≥80% overall maintained

#### Deployment

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY services/orchestrator/package*.json ./
RUN npm ci --ignore-scripts
COPY services/orchestrator/src ./src
COPY services/orchestrator/tsconfig.json ./
RUN npm run build
EXPOSE 3005
CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**
```yaml
services:
  orchestrator:
    build: ./services/orchestrator
    ports:
      - "3005:3005"
    environment:
      - SERVICES_TOKEN=${SERVICES_TOKEN}
      - OTEL_ENABLED=${OTEL_ENABLED:-0}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/healthz"]
      interval: 10s
      timeout: 3s
      retries: 3
```

#### Observability

- **Logging:** Structured JSON to stdout
- **Metrics:** Request latency, error rate (via OTel when OTEL_ENABLED=1)
- **Tracing:** GenAI spans for state transitions (optional)
- **Health:** /healthz (liveness), /readyz (readiness, checks Maps initialized)

#### Rollback

```bash
# Immediate rollback
export SERVICES_SPLIT=0
npm run dev  # Monolith path active

# Revert code changes (if needed)
git revert <phase1-commit-sha>
```

#### Success Criteria

- [ ] All 8 gates GREEN before extraction
- [ ] Service created: `services/orchestrator/`
- [ ] All listed code moved with EXACT behavior
- [ ] Feature flag `SERVICES_SPLIT` added
- [ ] Adapter layer in monolith for flag=1
- [ ] 100% test coverage for new service
- [ ] Parity test: SERVICES_SPLIT=0 vs =1 (identical behavior)
- [ ] All 8 gates GREEN after extraction
- [ ] Rollback tested (flag=0 works)
- [ ] Evidence captured in `EVIDENCE_LOG.md` (see Evidence Ledger below)

---

### Phase 2: Runner Service

**Priority:** HIGH (No dependencies, clean extraction)

#### Scope
Sandbox test execution service. Owns all test-running logic.

#### Files & Line Ranges to Move

**From src/runner/ (entire modules):**
```
src/runner/runInSandbox.ts:L1-L293       → services/runner/src/sandbox/runInSandbox.ts
src/runner/detectTestCommand.ts (all)   → services/runner/src/detection/detectCommand.ts
src/runner/installDeps.ts (all)         → services/runner/src/deps/installDeps.ts
src/runner/runUIValidation.ts (all)     → services/runner/src/ui/runUIValidation.ts
```

**From src/domains/runner/routes.ts:**
```
L19-L40 (route handler logic)            → services/runner/src/api/routes.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/runner`  
**Port:** 3004  
**Env:** `RUNNER_URL=http://localhost:3004`  

**Endpoints:**
```typescript
POST   /v1/run-tests                     → RunResult
POST   /v1/run-ui-validation             → UIValidationResult
GET    /healthz                          → 200 { ok: true }
```

**Schemas:**
```typescript
RunInSandboxRequest: { projectRoot, projectSlug, timeoutMs?, sessionId?, abortSignal? }
RunResult: { status, passCount, failCount, durationMs, logsPath, timestamp, exitCode?, signal?, timedOut?, startedAt, finishedAt, errorMessage? }
UIValidationResult: { lighthouse, accessibility }
```

#### DI Surface

```typescript
// services/runner/src/types/deps.ts
export type RunnerDeps = {
  // None initially; runner is self-contained
};
```

#### Tests

- `services/runner/tests/sandbox/runInSandbox.test.ts` (100% coverage, all scenarios)
- `services/runner/tests/detection/detectCommand.test.ts` (npm, pnpm, yarn)
- `services/runner/tests/deps/installDeps.test.ts` (install flows, security)
- Integration test: `tests/integration/runner-service.test.ts` (SERVICES_SPLIT=1 parity)

**Coverage:** 100% for services/runner/src/

#### Monolith Adapter

```typescript
// src/server.ts
const runTests = SERVICES_SPLIT 
  ? (opts) => runnerClient.runTests(opts)
  : runInSandbox;
```

#### Success Criteria

- [ ] All 8 gates GREEN (before/after)
- [ ] Service created: `services/runner/`
- [ ] All code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] 100% test coverage
- [ ] Parity test passes
- [ ] Evidence logged

---

### Phase 3: Planning Service

**Priority:** HIGH (Depends on Runner)

#### Scope
Task decomposition and subtask execution orchestration.

#### Files & Line Ranges to Move

**From src/planning/ (entire modules):**
```
src/planning/decomposeTask.ts (all)          → services/planning/src/decompose/decomposeTask.ts
src/planning/executeTaskPlan.ts (all)       → services/planning/src/execute/executeTaskPlan.ts
src/planning/generateSubtaskOutput.ts (all) → services/planning/src/generate/generateSubtask.ts
src/planning/validateDecomposition.ts (all) → services/planning/src/validate/validateDecomposition.ts
src/planning/estimateCompletion.ts (all)    → services/planning/src/estimate/estimateCompletion.ts
src/planning/progressTracker.ts (all)       → services/planning/src/progress/progressTracker.ts
```

**From src/server.ts:**
```
L484-L579  (createPlanExecutionContext)     → services/planning/src/context/createContext.ts
L580-L801  (executePlanFlow)                → services/planning/src/execute/executePlanFlow.ts
```

**From src/domains/plan/routes.ts:**
```
L15-L40 (route handlers)                    → services/planning/src/api/routes.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/planning`  
**Port:** 3002  
**Env:** `PLANNING_URL=http://localhost:3002`  

**Endpoints:**
```typescript
POST   /v1/plan/decompose                → TaskPlan
POST   /v1/plan/execute                  → PlanExecutionResult
POST   /v1/plan/subtask                  → SubtaskOutput
GET    /v1/plan/:planId/progress         → ProgressSnapshot
GET    /healthz                          → 200
```

**Schemas:**
```typescript
DecomposeRequest: { prompt, clarifications? }
TaskPlan: { id, prompt, subtasks[], dependencies, qualityScore }
Subtask: { id, title, description, dependencies, estimatedMs }
PlanExecutionResult: { planId, status, subtasks[], finalOutput, durationMs }
SubtaskOutput: ExecutorOutput (files, dependencies, tests)
```

#### Dependencies

- **Runner:** POST /v1/run-tests (test execution per subtask)
- **Orchestrator:** GET /v1/progress/:sessionId (progress updates)

#### DI Surface

```typescript
export type PlanningDeps = {
  runTests: (opts: RunInSandboxRequest) => Promise<RunResult>;
  logEvent: (type: string, data: Record<string, unknown>) => Promise<void>;
};
```

#### Tests

- `services/planning/tests/decompose/decomposeTask.test.ts` (quality scoring)
- `services/planning/tests/execute/executeTaskPlan.test.ts` (subtask flows)
- `services/planning/tests/generate/generateSubtask.test.ts` (LLM generation)
- Integration: `tests/integration/planning-service.test.ts`

**Coverage:** 100% for services/planning/src/

#### Monolith Adapter

```typescript
// src/server.ts
const decomposeTask = SERVICES_SPLIT
  ? (prompt) => planningClient.decompose(prompt)
  : localDecomposeTask;

const executeTaskPlan = SERVICES_SPLIT
  ? (plan) => planningClient.execute(plan)
  : localExecuteTaskPlan;
```

#### Success Criteria

- [ ] All 8 gates GREEN
- [ ] Service: `services/planning/`
- [ ] Code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] Runner client integrated
- [ ] 100% coverage
- [ ] Parity test passes
- [ ] Evidence logged

---

### Phase 4: Repair Service

**Priority:** MEDIUM (Depends on Runner)

#### Scope
Multi-turn test failure repair logic.

#### Files & Line Ranges to Move

**From src/repair/ (entire modules):**
```
src/repair/multiTurnRepair.ts (all)      → services/repair/src/multi/multiTurnRepair.ts
src/repair/repairOnce.ts (all)           → services/repair/src/single/repairOnce.ts
src/repair/analyzeFailure.ts (all)       → services/repair/src/analyze/analyzeFailure.ts
src/repair/strategySelector.ts (all)     → services/repair/src/strategy/strategySelector.ts
src/repair/generateDiff.ts (all)         → services/repair/src/diff/generateDiff.ts
src/repair/buildRepairPrompt.ts (all)    → services/repair/src/prompt/buildPrompt.ts
```

**From src/domains/replay/routes.ts:**
```
L31-L40 (repair replay handler)          → services/repair/src/api/routes.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/repair`  
**Port:** 3003  
**Env:** `REPAIR_URL=http://localhost:3003`  

**Endpoints:**
```typescript
POST   /v1/repair/multi-turn             → RepairResult
POST   /v1/repair/once                   → RepairAttempt
POST   /v1/repair/analyze                → FailureAnalysis
GET    /healthz                          → 200
```

**Schemas:**
```typescript
RepairRequest: { projectRoot, projectSlug, runResult, maxAttempts?, sessionId? }
RepairResult: { status, attempts[], finalRunResult, repairHistory, durationMs }
RepairAttempt: { attemptNumber, strategy, changedFiles[], runResult }
RepairHistory: { attempts[], totalDurationMs, successfulAttempt?, failureReason? }
FailureAnalysis: { category, confidence, suggestedStrategy }
```

#### Dependencies

- **Runner:** POST /v1/run-tests (re-run tests after repair)
- **LLM Gateway:** POST /v1/llm/json (generate repair code)

#### DI Surface

```typescript
export type RepairDeps = {
  runTests: (opts: RunInSandboxRequest) => Promise<RunResult>;
  generateJSON: (opts: GenerateJSONOptions) => Promise<unknown>;
  logEvent: (type: string, data: Record<string, unknown>) => Promise<void>;
};
```

#### Tests

- `services/repair/tests/multi/multiTurnRepair.test.ts` (max attempts, strategies)
- `services/repair/tests/analyze/analyzeFailure.test.ts` (categorization)
- `services/repair/tests/strategy/strategySelector.test.ts` (adaptive selection)
- Integration: `tests/integration/repair-service.test.ts`

**Coverage:** 100% for services/repair/src/

#### Monolith Adapter

```typescript
const multiTurnRepair = SERVICES_SPLIT
  ? (opts) => repairClient.multiTurn(opts)
  : localMultiTurnRepair;
```

#### Success Criteria

- [ ] All 8 gates GREEN
- [ ] Service: `services/repair/`
- [ ] Code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] Runner + LLM clients integrated
- [ ] 100% coverage
- [ ] Parity test passes
- [ ] Evidence logged

---

### Phase 5: LLM Gateway Service

**Priority:** HIGH (Required by Repair, Planning, Executor)

#### Scope
Unified LLM provider abstraction with telemetry and tracing.

#### Files & Line Ranges to Move

**From src/llm/ (entire modules):**
```
src/llm/index.ts (all)                   → services/llm-gateway/src/api/index.ts
src/llm/providers/* (all)                → services/llm-gateway/src/providers/*
src/llm/trace.ts (all)                   → services/llm-gateway/src/tracing/trace.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/llm`  
**Port:** 3006  
**Env:** `LLM_GATEWAY_URL=http://localhost:3006`  

**Endpoints:**
```typescript
POST   /v1/llm/json                      → LLMResponse
POST   /v1/llm/stream                    → SSE stream
GET    /v1/llm/providers                 → { providers: string[] }
GET    /healthz                          → 200
```

**Schemas:**
```typescript
LLMRequest: { provider, model, systemPrompt, userPrompt, schema?, temperature?, traceContext? }
LLMResponse: { content, usage, provider, model, traceId?, durationMs }
TraceContext: { sessionId?, phase?, taskId? }
```

#### Dependencies

- **Telemetry:** OTel spans (when OTEL_ENABLED=1)

#### DI Surface

```typescript
export type LLMDeps = {
  // None; gateway is leaf service
};
```

#### Tests

- `services/llm-gateway/tests/api/json.test.ts` (JSON generation)
- `services/llm-gateway/tests/providers/openai.test.ts` (OpenAI integration)
- `services/llm-gateway/tests/providers/anthropic.test.ts` (Claude integration)
- `services/llm-gateway/tests/tracing/trace.test.ts` (trace context propagation)
- Integration: `tests/integration/llm-gateway-service.test.ts`

**Coverage:** 100% for services/llm-gateway/src/

#### Monolith Adapter

```typescript
const generateJSON = SERVICES_SPLIT
  ? (opts) => llmClient.generateJSON(opts)
  : localGenerateJSON;
```

#### Success Criteria

- [ ] All 8 gates GREEN
- [ ] Service: `services/llm-gateway/`
- [ ] Code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] OTel tracing preserved
- [ ] 100% coverage
- [ ] Parity test passes
- [ ] Evidence logged

---

### Phase 6: Files & Status Service

**Priority:** LOW (Read-only, no business logic)

#### Scope
File serving, output archives, health checks, execution status reads.

#### Files & Line Ranges to Move

**From src/domains/files/routes.ts:**
```
L20-L277 (entire file)                   → services/files-status/src/files/routes.ts
```

**From src/domains/status/routes.ts:**
```
L10-L29 (entire file)                    → services/files-status/src/status/routes.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/files`  
**Port:** 3008  
**Env:** `FILES_STATUS_URL=http://localhost:3008`  

**Endpoints:**
```typescript
GET    /healthz                          → 200
GET    /v1/output-archive/:project       → tar/zip stream
GET    /v1/output/:project/*             → directory listing HTML
GET    /v1/files/:project/:path(*)       → file content (raw)
GET    /v1/executions/:id                → ExecutionRecord (proxy to orchestrator)
```

**Schemas:**
```typescript
DirectoryListing: { name, path, type, size, mtime }[]
FileContent: raw bytes
ExecutionRecord: { id, sessionId, state, createdAt, updatedAt }
```

#### Dependencies

- **Orchestrator:** GET /v1/executions/:id (execution status)

#### DI Surface

```typescript
export type FilesStatusDeps = {
  slugify: (str: string) => string;
  outputDir: string;
};
```

#### Tests

- `services/files-status/tests/files/archives.test.ts` (tar/zip generation)
- `services/files-status/tests/files/listing.test.ts` (HTML rendering)
- `services/files-status/tests/status/routes.test.ts` (health checks)
- Integration: `tests/integration/files-status-service.test.ts`

**Coverage:** 100% for services/files-status/src/

#### Monolith Adapter

```typescript
// Proxy requests to service when SERVICES_SPLIT=1
app.use("/output", SERVICES_SPLIT 
  ? proxyMiddleware(FILES_STATUS_URL)
  : express.static(OUTPUT_DIR)
);
```

#### Success Criteria

- [ ] All 8 gates GREEN
- [ ] Service: `services/files-status/`
- [ ] Code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] Archive streaming works
- [ ] 100% coverage
- [ ] Parity test passes
- [ ] Evidence logged

---

### Phase 7: Executor Service

**Priority:** HIGHEST (Final extraction, most complex)

#### Scope
Main execution orchestration. Coordinates all other services.

#### Files & Line Ranges to Move

**From src/server.ts:**
```
L802-L1158 (runSingleExecution)          → services/executor/src/execution/runSingle.ts
```

**From src/executor/ (entire modules):**
```
src/executor/schema.ts (all)             → services/executor/src/validation/schema.ts
src/executor/outputProcessing.ts (all)   → services/executor/src/processing/outputProcessing.ts
src/executor/writeFiles.ts (all)         → services/executor/src/files/writeFiles.ts
src/executor/systemPrompt.md (all)       → services/executor/src/prompts/systemPrompt.md
src/executor/types.ts (all)              → services/executor/src/types/executor.ts
```

**From src/domains/execute/routes.ts:**
```
L5-L9 (makeExecuteHandler)               → services/executor/src/api/routes.ts
```

**From src/domains/execute/helpers.ts:**
```
(entire file)                            → services/executor/src/helpers/executionHelpers.ts
```

#### Service Contract (REST API)

**Base Path:** `/v1/executor`  
**Port:** 3001  
**Env:** `EXECUTOR_URL=http://localhost:3001`  

**Endpoints:**
```typescript
POST   /v1/execute                       → ExecuteResponse (SSE or JSON)
GET    /v1/executions/:id                → ExecutionStatus
POST   /v1/generate                      → ExecutorOutput (code generation only)
GET    /healthz                          → 200
```

**Schemas:**
```typescript
ExecuteRequest: { prompt, clarifications?, deterministic?, sessionId? }
ExecuteResponse: { ok, project, slug, status, files, testResults, repairHistory?, taskPlan?, durationMs }
ExecutorOutput: { files[], dependencies[], tests?, healthEndpoint? }
ExecutionStatus: { id, sessionId, state, progress, stage }
```

#### Dependencies

- **Orchestrator:** ALL endpoints (state, progress, sessions)
- **Runner:** POST /v1/run-tests
- **Planning:** POST /v1/plan/decompose, POST /v1/plan/execute
- **Repair:** POST /v1/repair/multi-turn
- **LLM Gateway:** POST /v1/llm/json
- **Files:** POST /v1/files/write (if needed)

#### DI Surface

```typescript
export type ExecutorDeps = {
  orchestrator: OrchestratorClient;
  runner: RunnerClient;
  planning: PlanningClient;
  repair: RepairClient;
  llm: LLMClient;
  logEvent: (type: string, data: Record<string, unknown>) => Promise<void>;
};
```

#### Tests

- `services/executor/tests/execution/runSingle.test.ts` (full execution flows)
- `services/executor/tests/validation/schema.test.ts` (output validation)
- `services/executor/tests/processing/outputProcessing.test.ts` (sanitization)
- `services/executor/tests/files/writeFiles.test.ts` (file writing)
- Integration: `tests/integration/executor-service.test.ts` (end-to-end with all services)

**Coverage:** 100% for services/executor/src/

#### Monolith Adapter

```typescript
// Gateway mode: monolith proxies /api/execute to executor service
app.post("/api/execute", SERVICES_SPLIT
  ? proxyMiddleware(EXECUTOR_URL + "/v1/execute")
  : localExecuteHandler
);
```

#### Success Criteria

- [ ] All 8 gates GREEN
- [ ] Service: `services/executor/`
- [ ] Code moved, behavior 1:1
- [ ] Feature flag integrated
- [ ] All service clients integrated
- [ ] Full e2e test (prompt → output) passes
- [ ] 100% coverage
- [ ] Parity test: SERVICES_SPLIT=0 vs =1
- [ ] Evidence logged
- [ ] **Monolith can be decommissioned** (optional final step)

---

## 📋 Session Template (Copy for Each Phase)

### Pre-Phase Checklist

```markdown
## Phase [N]: [SERVICE_NAME] Extraction

### Before Starting (Evidence Required)

**Date:** [YYYY-MM-DD]  
**Operator:** [Name/Email]  
**Baseline Git SHA:** [commit-hash]  

#### G1: Lint
```bash
npm run -s lint
```
**Output:**
[Paste full output here]

**Status:** ✅ PASS (exit 0) / ❌ FAIL (exit [code])

#### G2: TypeCheck
```bash
npm run -s typecheck
```
**Output:**
[Paste full output here]

**Status:** ✅ PASS / ❌ FAIL

#### G3: Tests
```bash
npm -s test
```
**Output (last 80 lines):**
[Paste coverage summary + final results]

**Status:** ✅ PASS (498+ passing, coverage ≥80%/75%) / ❌ FAIL

#### G4: Contracts
```bash
npm run contract:check
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G5: Build
```bash
npm run build
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G6a: SBOM (SPDX)
```bash
npm run sbom
```
**Output:**
[Paste]

**Artifact:** sbom.spdx.json (SHA256: [hash])

**Status:** ✅ PASS / ❌ FAIL

#### G6b: SBOM (CycloneDX)
```bash
npm run sbom:cyclonedx
```
**Output:**
[Paste]

**Artifact:** sbom.cdx.json (SHA256: [hash])

**Status:** ✅ PASS / ❌ FAIL

#### G7: Provenance
```bash
npm run provenance
```
**Output:**
[Paste]

**Artifact:** provenance.intoto.jsonl (SHA256: [hash])

**Status:** ✅ PASS / ❌ FAIL

---

### Pre-Extraction Summary

**All Gates Status:** [ALL GREEN ✅ / FAILURES: list] 

**Halt Decision:** [PROCEED / STOP (reason)]

---

### Extraction Execution

**Approach:** [Strangler Fig / Feature Flag / Branch-by-Abstraction]  
**Feature Flag:** SERVICES_SPLIT=1  
**Rollback Plan:** Set SERVICES_SPLIT=0, revert commit [hash]

**Files Changed:**
- Created: services/[service]/...
- Modified: src/server.ts (adapter), src/...
- Deleted: [none / list]

**Behavior Preservation Checklist:**
- [ ] API paths unchanged
- [ ] Status codes identical (200, 400, 404, 500, etc.)
- [ ] Payloads schema-identical
- [ ] Logs/messages preserved
- [ ] Feature flags untouched
- [ ] Error types preserved (RFC 9457)

**Service Integration:**
- [ ] HTTP client created: [service]Client.ts
- [ ] Retry logic added (idempotent endpoints only)
- [ ] Timeout: [N]ms
- [ ] Auth: Authorization Bearer token
- [ ] Health check: GET /healthz

**Tests Added:**
- [ ] Unit tests: [list files]
- [ ] Integration tests: [list files]
- [ ] Parity test: SERVICES_SPLIT=0 vs =1
- [ ] Coverage: 100% for new service modules

---

### Post-Extraction Validation (Evidence Required)

#### G1: Lint
```bash
npm run -s lint
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G2: TypeCheck
```bash
npm run -s typecheck
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G3: Tests
```bash
npm -s test
```
**Output (last 80 lines):**
[Paste coverage + results]

**New Tests Added:** [count]  
**Coverage Delta:** [+/-]% lines, [+/-]% branches

**Status:** ✅ PASS (498+ passing, ≥80%/75%) / ❌ FAIL

#### G4: Contracts
```bash
npm run contract:check
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G5: Build
```bash
npm run build
```
**Output:**
[Paste]

**Status:** ✅ PASS / ❌ FAIL

#### G6a: SBOM (SPDX)
```bash
npm run sbom
```
**Diff:** [no changes / new deps: list]

**Status:** ✅ PASS / ❌ FAIL

#### G6b: SBOM (CycloneDX)
```bash
npm run sbom:cyclonedx
```
**Diff:** [no changes / new deps: list]

**Status:** ✅ PASS / ❌ FAIL

#### G7: Provenance
```bash
npm run provenance
```
**Status:** ✅ PASS / ❌ FAIL

---

### Post-Extraction Summary

**All Gates Status:** [ALL GREEN ✅ / FAILURES: list]

**Rollback Test:**
```bash
export SERVICES_SPLIT=0
npm run dev
# Test /api/execute manually
```
**Rollback Works:** ✅ YES / ❌ NO (evidence: [describe])

---

### Final Status

**Phase [N] Status:** ✅ COMPLETE / ❌ FAILED  

**Failures (if any):**
- Gate: [which gate]
- Error: [exact error message]
- Fix Required: [action]

**Evidence Artifacts:**
- Discovery Note: [path]
- Test Reports: [path]
- Coverage Reports: [path]
- Commit SHA: [hash]
- PR Link: [url]

**Sign-Off:** [Name/Email] — [Date]

```

---

## 🎯 AI Prompt Template (Use for Each Phase)

```markdown
# ROLE
You are extracting the **[SERVICE_NAME]** microservice from a fully tested monolith.

# MISSION
Move code from monolith to services/[service]/ WITHOUT changing ANY behavior.

# NON-NEGOTIABLE RULES
1. Run ALL 8 gates BEFORE starting (paste outputs)
2. If ANY gate fails → STOP, report, wait for fix
3. Move ONLY the code listed in exact line ranges
4. Preserve 1:1 behavior:
   - API paths unchanged
   - Status codes identical
   - Payloads schema-identical
   - Logs/messages character-for-character
   - Error types preserved (RFC 9457)
5. Add feature flag: SERVICES_SPLIT (0=monolith, 1=service)
6. Run ALL 8 gates AFTER extraction (paste outputs)
7. If ANY gate fails → STOP, fix, re-run

# CONTEXT (Paste from Phase [N] in Refactor Plan)

[Paste the "Files & Line Ranges to Move" section exactly]

# VALIDATION GATES (Run & Paste Full Outputs)

```bash
npm run -s lint && \
npm run -s typecheck && \
npm -s test && \
npm run contract:check && \
npm run build && \
npm run sbom && \
npm run sbom:cyclonedx && \
npm run provenance
```

ALL commands MUST exit 0. Zero warnings. Coverage ≥80% line / ≥75% branch.

# TASKS

1. **Verify Gates (BEFORE)**
   - Run all 8 gates
   - Paste full outputs
   - Confirm ALL GREEN ✅
   - If ANY fail → STOP

2. **Create Service Structure**
   ```
   services/[service]/
   ├── src/
   │   ├── api/
   │   ├── [domain]/
   │   └── types/
   ├── tests/
   ├── package.json
   ├── tsconfig.json
   └── Dockerfile
   ```

3. **Move Code (EXACT line ranges)**
   - Copy from monolith → service
   - NO rewrites, NO "improvements"
   - Keep comments, formatting, logic identical

4. **Add Feature Flag Adapter**
   ```typescript
   // src/server.ts
   const SERVICES_SPLIT = process.env.SERVICES_SPLIT === "1";
   const [SERVICE]_URL = process.env.[SERVICE]_URL || "http://localhost:[port]";

   const [function] = SERVICES_SPLIT
     ? (...args) => [service]Client.[method](...args)
     : local[function];
   ```

5. **Write Tests**
   - 100% coverage for services/[service]/src/
   - Parity test: SERVICES_SPLIT=0 vs =1 (behavior identical)
   - Integration test: monolith calls service

6. **Verify Gates (AFTER)**
   - Run all 8 gates
   - Paste full outputs
   - Confirm ALL GREEN ✅
   - If ANY fail → STOP, fix, re-run

7. **Test Rollback**
   ```bash
   export SERVICES_SPLIT=0
   npm run dev
   # Verify original behavior works
   ```

# HALT CONDITIONS (STOP IMMEDIATELY IF)

- Any gate exits non-zero
- Coverage drops below 80% line or 75% branch
- ANY lint warning appears
- ANY TypeScript error
- ANY test failure
- Build fails
- Contract validation fails

# OUTPUT FORMAT (REQUIRED)

## Pre-Extraction Gates
```
[Paste all 8 gate outputs here]
```

**Status:** [ALL GREEN ✅ / FAILURES: list]

---

## Extraction Complete

**Files Changed:**
- Created: [list]
- Modified: [list]
- Deleted: [list]

**Lines Moved:** [count] (from [source files])

**Feature Flag:** SERVICES_SPLIT added in [file:line]

**Adapter:** [service]Client created in [file:line]

---

## Post-Extraction Gates
```
[Paste all 8 gate outputs here]
```

**Status:** [ALL GREEN ✅ / FAILURES: list]

**Coverage Delta:** [+/-]% lines, [+/-]% branches

**New Tests:** [count] files, [count] test cases

---

## Rollback Test
```bash
export SERVICES_SPLIT=0
npm run dev
```

**Result:** ✅ WORKS / ❌ FAILS (details: [describe])

---

## Final Status

**Phase [N]:** ✅ PASS / ❌ FAIL

**Evidence:**
- Pre-gates: GREEN ✅
- Post-gates: GREEN ✅
- Rollback: WORKS ✅
- Parity test: PASS ✅

**Commit SHA:** [hash]

**Operator Sign-Off:** [Name] — [Date]

# STANDARDS ALIGNMENT

- **Strangler Fig Pattern:** martinfowler.com/bliki/StranglerFigApplication.html
- **Feature Toggles:** martinfowler.com/articles/feature-toggles.html
- **Branch by Abstraction:** martinfowler.com/bliki/BranchByAbstraction.html
- **RFC 9457 Problem Details:** rfc-editor.org/rfc/rfc9457.html
- **OpenAPI 3.1.1:** spec.openapis.org/oas/v3.1.1
- **JSON Schema 2020-12:** json-schema.org/specification.html

# EVIDENCE OR SILENCE

Every claim must be backed by:
- File path + line numbers
- Command outputs (full)
- Test results (full)
- Coverage reports
- Commit SHAs

No assumptions. No guesses. Evidence only.
```

---

## 📊 Evidence Ledger Specification

### File: `.automation/EVIDENCE_LOG.md`

**Purpose:** Immutable record of all phase executions with hashes for verification.

**Format:**

```markdown
# Microservice Refactoring Evidence Ledger

**Project:** ai_system_executor-mvp  
**Refactoring Start:** [YYYY-MM-DD]  
**Status:** [IN PROGRESS / COMPLETE]  

---

## Phase 1: Orchestrator Service

**Date:** [YYYY-MM-DD]  
**Operator:** [Name/Email]  
**Baseline Commit:** [sha]  
**Completion Commit:** [sha]  

### Pre-Extraction Evidence

**G1: Lint**
- Command: `npm run -s lint`
- Exit Code: 0
- Output SHA256: [hash]
- Full Output: [link to .automation/phase1/pre-lint.txt]

**G2: TypeCheck**
- Command: `npm run -s typecheck`
- Exit Code: 0
- Output SHA256: [hash]
- Full Output: [link to .automation/phase1/pre-typecheck.txt]

**G3: Tests**
- Command: `npm -s test`
- Exit Code: 0
- Tests Passed: 498
- Tests Failed: 0
- Coverage: 82.17% lines, 75.52% branches
- Output SHA256: [hash]
- Full Output: [link to .automation/phase1/pre-test.txt]

**G4: Contracts**
- Command: `npm run contract:check`
- Exit Code: 0
- Output SHA256: [hash]

**G5: Build**
- Command: `npm run build`
- Exit Code: 0
- Output SHA256: [hash]

**G6a: SBOM (SPDX)**
- Command: `npm run sbom`
- Exit Code: 0
- Artifact: sbom.spdx.json
- Artifact SHA256: [hash]

**G6b: SBOM (CycloneDX)**
- Command: `npm run sbom:cyclonedx`
- Exit Code: 0
- Artifact: sbom.cdx.json
- Artifact SHA256: [hash]

**G7: Provenance**
- Command: `npm run provenance`
- Exit Code: 0
- Artifact: provenance.intoto.jsonl
- Artifact SHA256: [hash]

**Pre-Extraction Summary:** ✅ ALL GATES GREEN

---

### Extraction Actions

**Files Created:**
- services/orchestrator/src/state/sessionStore.ts (137 lines)
- services/orchestrator/src/progress/setProgress.ts (89 lines)
- [... full list]

**Files Modified:**
- src/server.ts (added adapter at L112-L156)
- [... full list]

**Files Deleted:**
- [none / list]

**Total Lines Moved:** [count]

**Feature Flag:** SERVICES_SPLIT added in src/server.ts:L105

**Service Port:** 3005

**API Endpoints Added:**
- GET /v1/executions/:id
- POST /v1/sessions/:id/pause
- POST /v1/sessions/:id/resume
- GET /v1/progress/:sessionId
- GET /v1/progress/:sessionId/stream
- GET /healthz

**Tests Added:**
- services/orchestrator/tests/state/sessionStore.test.ts (23 tests)
- services/orchestrator/tests/api/sessions.test.ts (15 tests)
- [... full list]

**Total New Tests:** [count]

---

### Post-Extraction Evidence

**G1: Lint**
- Exit Code: 0
- Output SHA256: [hash]
- Diff from Pre: [identical / changes: describe]

**G2: TypeCheck**
- Exit Code: 0
- Output SHA256: [hash]

**G3: Tests**
- Exit Code: 0
- Tests Passed: 536 (+38 new)
- Tests Failed: 0
- Coverage: 83.42% lines (+1.25%), 76.18% branches (+0.66%)
- Output SHA256: [hash]

**G4-G7:** [repeat pattern]

**Post-Extraction Summary:** ✅ ALL GATES GREEN

---

### Rollback Test

```bash
export SERVICES_SPLIT=0
npm run dev
curl -X POST http://localhost:3000/api/execute -d '{"prompt":"test"}' -H "Content-Type: application/json"
```

**Result:** ✅ 200 OK, behavior identical to pre-extraction

**Evidence:** [link to rollback-test-output.txt]

---

### Phase 1 Sign-Off

**Status:** ✅ COMPLETE  
**All Gates:** GREEN ✅  
**Rollback Tested:** YES ✅  
**Parity Test:** PASS ✅  
**Evidence Artifacts:** [link to .automation/phase1/]  

**Operator:** [Name/Email]  
**Date:** [YYYY-MM-DD]  
**Commit:** [sha]  

---

## Phase 2: Runner Service

[Repeat pattern]

---

[Continue for all 7 phases]
```

---

## 🚨 Rollback Procedures

### Immediate Rollback (No Code Changes)

```bash
# Stop service
docker-compose down [service]

# Set flag to monolith
export SERVICES_SPLIT=0

# Restart monolith
npm run dev

# Verify
curl http://localhost:3000/healthz
```

**Timeframe:** < 1 minute  
**Data Loss:** None (state in orchestrator retained)

### Code Rollback (Revert Commits)

```bash
# Identify phase commit
git log --oneline --grep="Phase [N]"

# Revert
git revert [commit-sha]

# Rebuild
npm run build

# Test
npm test

# Deploy
npm run dev
```

**Timeframe:** < 5 minutes  
**Data Loss:** None (outputs preserved)

### Full Rollback (Nuclear Option)

```bash
# Revert all phases
git checkout [baseline-commit-sha]

# Clean
npm ci
npm run build

# Deploy
npm run dev
```

**Timeframe:** < 10 minutes  
**Data Loss:** Service-specific state (executions, progress) reset

---

## 📈 Success Metrics

### Per-Phase Metrics

- **Gate Pass Rate:** 100% (all 8 gates GREEN pre + post)
- **Test Coverage:** ≥80% lines, ≥75% branches maintained
- **New Tests Added:** [count per phase]
- **Lines Moved:** [count per phase]
- **API Parity:** 100% (paths, payloads, status codes identical)
- **Rollback Success:** 100% (flag=0 restores monolith)

### Overall Completion Metrics

- **Total Phases:** 7
- **Total Services:** 7
- **Total Lines Extracted:** [sum across phases]
- **Total Tests Added:** [sum]
- **Final Monolith Size:** [lines remaining in src/server.ts]
- **Service Uptime:** ≥99.9% (after stabilization)
- **Latency Regression:** ≤5% (service-to-service overhead)

### Quality Gates for "Done"

- [ ] All 7 phases complete
- [ ] All 498+ tests passing
- [ ] Coverage ≥80% / ≥75%
- [ ] All services deployable via docker-compose
- [ ] All services have /healthz and /readyz
- [ ] Parity tests pass: SERVICES_SPLIT=0 vs =1 (behavior identical)
- [ ] Load test: /api/execute handles 10 concurrent requests (same latency)
- [ ] Rollback tested: SERVICES_SPLIT=0 works in production
- [ ] Documentation complete: OpenAPI specs per service
- [ ] Evidence log complete: all 7 phases signed off

---

## 🛡️ Risk Mitigation

### Risk 1: Service-to-Service Latency

**Mitigation:**
- Keep services on same host initially (localhost)
- Use HTTP/1.1 keep-alive for connection reuse
- Add latency budgets: ≤100ms per service call
- Monitor with OTel tracing (when OTEL_ENABLED=1)

### Risk 2: Partial Failure Cascades

**Mitigation:**
- Timeout every service call (default 5s)
- Retry only idempotent endpoints (GET, HEAD)
- Return RFC 9457 problem details on errors
- Implement circuit breakers (future: add Polly or similar)

### Risk 3: State Inconsistency

**Mitigation:**
- Orchestrator is single source of truth for state
- All services read from orchestrator (no local state)
- Use transactions where possible (future: add saga pattern)

### Risk 4: Authentication Bypass

**Mitigation:**
- All service-to-service calls require `Authorization: Bearer ${SERVICES_TOKEN}`
- Token validated on every request
- Reject requests without token (403 Forbidden)
- Rotate token regularly (env var update)

### Risk 5: Incomplete Rollback

**Mitigation:**
- Feature flag SERVICES_SPLIT=0 restores monolith path
- No code deletions until all phases stable in production
- Keep monolith code in place for 30 days post-completion
- Document rollback procedure in runbook

---

## 📚 References & Standards

### Industry Patterns
- **Strangler Fig Application:** [martinfowler.com/bliki/StranglerFigApplication.html](https://martinfowler.com/bliki/StranglerFigApplication.html)
- **Feature Toggles:** [martinfowler.com/articles/feature-toggles.html](https://martinfowler.com/articles/feature-toggles.html)
- **Branch by Abstraction:** [martinfowler.com/bliki/BranchByAbstraction.html](https://martinfowler.com/bliki/BranchByAbstraction.html)
- **AWS Strangler Fig:** [docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html)

### API Standards
- **RFC 9457 Problem Details:** [rfc-editor.org/rfc/rfc9457.html](https://www.rfc-editor.org/rfc/rfc9457.html)
- **OpenAPI 3.1.1:** [spec.openapis.org/oas/v3.1.1](https://spec.openapis.org/oas/v3.1.1)
- **JSON Schema 2020-12:** [json-schema.org/specification.html](https://json-schema.org/specification.html)

### Testing & Quality
- **Test Pyramid:** [martinfowler.com/articles/practical-test-pyramid.html](https://martinfowler.com/articles/practical-test-pyramid.html)
- **Contract Testing:** [pact.io](https://pact.io)
- **Property-Based Testing:** [hypothesis.works](https://hypothesis.works)

### AI-Assisted Refactoring Research
- **Few-Shot Refactoring:** [arxiv.org/abs/2311.11690](https://arxiv.org/abs/2311.11690) (Refactoring Programs Using LLMs)
- **Claude Code Best Practices:** [anthropic.com/engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- **LLM Code Generation 2024:** [scribbledata.io/blog/top-llms-for-code-generation-2024](https://www.scribbledata.io/blog/the-top-llms-for-code-generation-2024-edition/)

### Observability
- **OpenTelemetry Spec:** [opentelemetry.io/docs/specs/otel/](https://opentelemetry.io/docs/specs/otel/)
- **Structured Logging:** [12factor.net/logs](https://12factor.net/logs)

---

## 🎯 Quick Start (Execute Phase 1 Now)

### Prerequisites

1. **Verify Baseline:**
   ```bash
   cd /Users/Yousef_1/Downloads/ai_system_executor-mvp
   npm run -s lint && npm run -s typecheck && npm -s test
   ```
   **Expected:** ALL GREEN (498 tests passing, 82.17% / 75.52% coverage)

2. **Create Evidence Directory:**
   ```bash
   mkdir -p .automation/phase1/{pre,post}
   ```

3. **Capture Baseline Hashes:**
   ```bash
   git rev-parse HEAD > .automation/phase1/baseline-commit.txt
   npm run sbom && shasum -a 256 sbom.spdx.json > .automation/phase1/baseline-sbom.sha256
   ```

### Execute Phase 1 (Copy This Prompt)

```markdown
# PHASE 1: ORCHESTRATOR SERVICE EXTRACTION

## CONTEXT
- **Service:** Orchestrator (state, progress, sessions)
- **Priority:** HIGHEST (all other services depend on this)
- **Baseline:** ALL TESTS GREEN (498 passing, 82.17%/75.52% coverage)

## FILES TO MOVE (EXACT LINE RANGES)

### From src/server.ts:
- L130-L156 → services/orchestrator/src/state/sessionStore.ts
- L158-L175 → services/orchestrator/src/state/stateMapper.ts
- L177-L191 → services/orchestrator/src/state/stateMapper.ts
- L194-L201 → services/orchestrator/src/state/ttl.ts
- L203-L242 → services/orchestrator/src/progress/setProgress.ts
- L255-L263 → services/orchestrator/src/progress/getProgress.ts
- L323-L339 → services/orchestrator/src/progress/snapshot.ts
- L340-L363 → services/orchestrator/src/progress/stream.ts

### From src/orchestrator/ (entire modules):
- stateMachine.ts → services/orchestrator/src/machine/
- stepQueue.ts → services/orchestrator/src/queue/
- executionsStore.ts → services/orchestrator/src/executions/
- abortSignal.ts → services/orchestrator/src/signals/
- resume.ts → services/orchestrator/src/resume/
- resumePrompt.ts → services/orchestrator/src/resume/
- checkpoints.ts → services/orchestrator/src/checkpoints/
- interrupts.ts → services/orchestrator/src/interrupts/
- workspaceManifest.ts → services/orchestrator/src/workspace/

## SERVICE CONTRACT

**Port:** 3005  
**Endpoints:**
- GET /v1/executions/:id
- POST /v1/sessions/:id/pause
- POST /v1/sessions/:id/resume
- GET /v1/progress/:sessionId
- GET /v1/progress/:sessionId/stream
- GET /healthz

## TASKS

1. **Pre-Extraction Gates** (run & paste outputs):
   ```bash
   npm run -s lint > .automation/phase1/pre/lint.txt 2>&1
   npm run -s typecheck > .automation/phase1/pre/typecheck.txt 2>&1
   npm -s test > .automation/phase1/pre/test.txt 2>&1
   npm run contract:check > .automation/phase1/pre/contract.txt 2>&1
   npm run build > .automation/phase1/pre/build.txt 2>&1
   npm run sbom > .automation/phase1/pre/sbom.txt 2>&1
   npm run sbom:cyclonedx > .automation/phase1/pre/sbom-cdx.txt 2>&1
   npm run provenance > .automation/phase1/pre/provenance.txt 2>&1
   ```

2. **Create Service Structure:**
   ```bash
   mkdir -p services/orchestrator/{src,tests}
   # Initialize package.json, tsconfig.json, Dockerfile
   ```

3. **Move Code** (exact line ranges, NO changes)

4. **Add Feature Flag Adapter** in src/server.ts:
   ```typescript
   const SERVICES_SPLIT = process.env.SERVICES_SPLIT === "1";
   const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:3005";
   ```

5. **Write Tests** (100% coverage for services/orchestrator/src/)

6. **Post-Extraction Gates** (run & paste outputs to .automation/phase1/post/)

7. **Rollback Test:**
   ```bash
   export SERVICES_SPLIT=0
   npm run dev
   curl http://localhost:3000/healthz
   ```

## HALT IF
- Any gate fails
- Coverage drops below 80%/75%
- Any lint warning
- Any test failure

## REPORT FORMAT

### Pre-Gates
[Paste all 8]

### Extraction
[Files changed]

### Post-Gates
[Paste all 8]

### Status
✅ PASS / ❌ FAIL

---

**Operator:** [Your Name]  
**Date:** [Today's Date]
```

---

## 📝 Final Notes

### What This Plan Delivers

1. **7 Production-Ready Microservices** (Orchestrator, Runner, Planning, Repair, LLM Gateway, Files/Status, Executor)
2. **Zero Breaking Changes** (100% behavioral parity via feature flag)
3. **Instant Rollback** (SERVICES_SPLIT=0 restores monolith)
4. **Full Test Coverage** (100% for new services, ≥80%/75% overall)
5. **Evidence-Based Execution** (all 8 gates GREEN per phase)
6. **Immutable Audit Trail** (EVIDENCE_LOG.md with hashes)

### Success Definition

**"Ship Perfect or Never"**

A phase is ONLY complete when:
- All 8 gates GREEN before AND after
- 100% test coverage for new service
- Parity test passes (SERVICES_SPLIT=0 vs =1)
- Rollback tested and works
- Evidence logged with hashes

**No compromises. No shortcuts. No broken deliveries.**

---

**Status:** READY TO EXECUTE ✅  
**Next Action:** Copy Phase 1 prompt → Execute → Report evidence  
**Expected Duration:** 7 sessions × 4-8 hours = 28-56 hours total  

**Delivery Standard:** 498+ tests passing. Every. Single. Time.

---

END OF PLAN