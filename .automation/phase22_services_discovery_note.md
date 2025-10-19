# Phase 22 Services Discovery — Orchestrator Extraction

## Summary
- `/api/execute` currently instantiates `StepQueue` in-process (lines 1509-1870) and branches on `AGENTS_RUNTIME` to decide between StepQueue and LangGraph paths. Status polling is backed by the local executions store exposed at `/api/executions/:id`.
- LangGraph integration (`src/orchestrator/graph.ts`) performs the same StepQueue workflow but persists status via `updateExecution`/`completeExecution`/`failExecution` and tears down abort signals.
- Step handlers (`plan` and `single`) are defined alongside `runSingleExecution` and registered on the shared StepQueue before the route is declared, coupling orchestration and execution logic.

## Risks
1. **SSE semantics** — `/api/execute` streams `step`, `paused`, `completed`, and `error` events directly from StepQueue callbacks. Extracting orchestration must preserve event order and connection lifetime without regressions for existing clients.
2. **Abort signal lifecycle** — `createAbortSignal`/`cleanupAbortSignal` guard against concurrent executions and resume flows. Moving orchestration out-of-process requires an explicit channel to propagate abort/cleanup events across service boundaries.
3. **Execution store parity** — The in-memory `executionsStore` seeds the Location header contract. A remote orchestrator must surface identical payloads (including `logs`, `input`, and timestamps) or provide a migration path to an external store.

## Assumptions
- `ORCHESTRATOR_URL` will point to the new service and be consumed by the server when replacing `StepQueue.create()` with a client shim.
- Runner extraction (Tasks 16–18) will expose HTTP or queue endpoints that return the existing `StepExecutionResult` shape so StepQueue semantics remain unchanged.
- Feature flag `AGENTS_RUNTIME` continues to gate rollout, allowing fallback to current StepQueue path until orchestration + runner services reach parity.
