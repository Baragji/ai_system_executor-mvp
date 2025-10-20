# Phase 23 Services Discovery — Planning, Repair, Executor, Clarification

**Task ID:** REFACTOR-TASK-21  \
**Generated:** 2025-10-19T20:34:45Z

## Overview
- Discovery JSON: `.automation/phase23_services_discovery.json`
- Target services: planning, repair, executor, clarification
- Proxy environment variables: `PLANNING_URL`, `REPAIR_URL`, `EXECUTOR_URL`, `CLARIFICATION_URL`

## Integration Map

| Service | Key Files | Monolith Touch Points |
| --- | --- | --- |
| Planning | `src/planning/decomposeTask.ts`, `executeTaskPlan.ts`, `estimateCompletion.ts` | `src/server.ts` imports (lines 43–49); plan execution at lines 1005–1016; step queue handler lines 1466–1481 |
| Repair | `src/repair/multiTurnRepair.ts`, `analyzeFailure.ts`, `repairOnce.ts`, `generateDiff.ts` | `src/server.ts` import line 23; plan context wiring line 937; single run line 1320; replay endpoint line 2055 |
| Executor | `src/executor/outputProcessing.ts`, `schema.ts`, `writeFiles.ts` | `src/server.ts` imports lines 17–20; sanitization line 836; file writes lines 931, 1306, 2081; `executeSubtask.ts` line 209 |
| Clarification | `src/clarification/detectMissing.ts`, `generateQuestions.ts`, `augmentPrompt.ts`, `suggestDefaults.ts` | `/api/clarify` route lines 1593–1619; prompt augmentation lines 1720–1755 |

## Proposed Service Endpoints
- **Planning**
  - `POST /planning/decompose` → `{ plan: TaskPlan, warnings?: DecompositionIssue[] }`
  - `POST /planning/execute-plan` → `{ result: PlanExecutionResult, estimate: TimeEstimate }`
- **Repair**
  - `POST /repair/analyze` → `{ analysis: FailureAnalysis }`
  - `POST /repair/run` → `{ history: RepairHistory, artifacts: RepairArtifactDescription[] }`
- **Executor**
  - `POST /executor/generate` → `{ files: ExecutorFile[], hasTests: boolean, notes: string[] }`
  - `POST /executor/validate` → `{ status: "ok" | "error", issues?: string[] }`
- **Clarification**
  - `POST /clarification/clarify` → `{ questions: ClarificationQuestion[], suggestedDefaults: Record<string, unknown> }`
  - `POST /clarification/augment` → `{ effectivePrompt: string }`

## Risks & Mitigations
- Planning cancellation and telemetry rely on in-process hooks → require abort token propagation and streaming channel.
- Repair artifacts currently mutate filesystem → need artifact bundle contract or callback for monolith to apply changes.
- Executor write guardrails enforce path safety locally → replicate validation before remote writes.
- Clarification caches questions per prompt → persist cache or share store across requests.

## Parity Test Suite
Recommended regression commands (Vitest):
1. `vitest run tests/planning/decomposeTask.test.ts`
2. `vitest run tests/planning/executeTaskPlan.test.ts`
3. `vitest run tests/repair/multiTurnRepair.test.ts`
4. `vitest run tests/repair/repairOnce.test.ts`
5. `vitest run tests/executor/sanitizeOutput.test.ts`
6. `vitest run tests/executor/writeFiles.security.test.ts`
7. `vitest run tests/clarification/generateQuestions.test.ts`
8. `vitest run tests/clarification/augmentPrompt.test.ts`
9. `vitest run tests/api/clarify-route.test.ts`
10. `vitest run tests/run-tests-route.test.ts`

## Acceptance Criteria Snapshot
- Remote planning reproduces validation and PlanExecutionResult contract.
- Repair service preserves attempt ordering, telemetry, and pause semantics.
- Executor service delivers sanitized, schema-compliant payloads and safe file application.
- Clarification service provides deterministic questions and prompt augmentation.
