# P19-V04 — Discovery Note: Wire /api/execute flag path to LangGraph runtime

Date: 2025-10-25
Scope: Phase 19 Task P19-V04 — ensure the Express server dispatches flagged executions through the LangGraph runtime while preserving the legacy StepQueue workflow for the default path.

## Integration Points

- `src/server.ts`
  - The `/api/execute` handler inspects `AGENTS_RUNTIME` to choose between the LangGraph and StepQueue paths. When `langgraph` is selected it currently logs the runtime choice, derives an execution id via `buildExecutionId`, and builds the workflow steps before handing off to `runWithLangGraph`.
  - The same handler is responsible for persisting execution metadata through `createExecution`, returning HTTP 202 + `Location`, and detaching the async LangGraph invocation.
- `src/orchestrator/graph.ts`
  - Exports `buildExecutionId` and `runWithLangGraph`. The server relies on these helpers to generate deterministic execution ids and to stream workflow progress back into the shared execution store.
- `src/orchestrator/executionsStore.ts`
  - Provides `createExecution`, `updateExecution`, `completeExecution`, and `failExecution`. The server must initialize records before delegating to LangGraph, and the runner updates statuses as the graph progresses.
- `tests/api/executions.test.ts`
  - Covers the LangGraph flag path end-to-end by asserting that `/api/execute` responds with 202, exposes the execution id through the `Location` header, and that the execution eventually completes when polled.

## Observations

- The server constructs workflow steps identically for both runtimes, so LangGraph reuses the same StepQueue logic and avoids diverging behavior.
- SSE streaming remains disabled for LangGraph (`wantsSse` guards), which prevents the response from holding the HTTP connection open while the async graph runs.
- The execution store remains in-memory, so concurrent flagged executions rely on correct id namespacing (`graph-<sessionId>`).

## Risks

- Exceptions thrown before the async task is scheduled must transition the execution record to `failed`; otherwise clients polling `/api/executions/:id` could hang in `started`.
- Detached async tasks risk unhandled promise rejections if failures are not caught and logged.
- Overwriting the SSE behavior for the StepQueue path would regress existing clients relying on streaming updates.

## Next Steps

1. Review the `/api/execute` LangGraph branch to ensure it guards the async launch with error handling and creates the execution record before responding.
2. Verify that the StepQueue fallback is untouched when the feature flag is disabled.
3. Extend or adjust tests if necessary to cover runtime logging and execution-store initialization.
4. Capture implementation evidence and update the phase progress tracker once validations pass.
