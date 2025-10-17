# P19-V03 — Discovery Note: Replace orchestrator stub with LangGraph runner

Date: 2025-10-25
Scope: Phase 19 Task P19-V03 — implement the LangGraph runtime behind the `AGENTS_RUNTIME=langgraph` flag so executions use the real StateGraph integration and update the execution store.

## Integration Points

- `src/orchestrator/graph.ts`
  - Currently exports `runWithLangGraph` that builds a `StateGraph` with a single `runWorkflow` node, invokes `stepQueue.runWorkflow`, and writes execution status transitions via `updateExecution`, `completeExecution`, and `failExecution`.
  - The implementation already serializes step results into a `logs` array and surfaces the final response payload via `extractResponse` and `completeExecution`.
  - `buildExecutionId` prefixes IDs with `graph-` to avoid collisions when a `sessionId` is present.
- `src/server.ts`
  - The `/api/execute` route branches on `useLangGraph`. When true, it creates an execution record, responds with HTTP 202 + `Location`, and fires `runWithLangGraph` in a detached async task.
  - The same route still supports the StepQueue path when the flag is unset, ensuring parity for existing clients.
- `src/orchestrator/executionsStore.ts`
  - Provides `createExecution`, `updateExecution`, `completeExecution`, and `failExecution` utilities relied upon by both the server and the graph runtime.
- `tests/orchestrator/parity.test.ts`
  - End-to-end parity check that polls `/api/executions/:id` after triggering the LangGraph path and compares outputs against the direct StepQueue result.
- `tests/orchestrator/perf-overhead.test.ts`
  - Measures the LangGraph path duration to ensure the runtime completes quickly, exercising the same code paths.

## Observations

- `runWithLangGraph` already invokes `updateExecution(executionId, { status: "running" })` inside the LangGraph node, but it does not record timestamps explicitly; `updateExecution` normalizes timestamps internally, which satisfies store requirements.
- The `StateGraph` builder uses the test stub `tests/setup/langgraph-runtime-stub.ts` to avoid needing the real LangGraph WASM runtime under Vitest; the compiled app simply runs the registered node handlers in order during tests.
- Errors thrown from the LangGraph invocation bubble up to the `/api/execute` catch block, which already calls `failExecution` if the request failed before delegating. `runWithLangGraph` itself also calls `failExecution`, providing redundancy.
- The `StepQueue` workflow callback collects serialized step data, but there are no unit tests asserting the structure of the stored `logs`. Adding focused tests around the runner would improve confidence.

## Risks

- Double-writing failures (both in the server catch and inside `runWithLangGraph`) could overwrite error metadata; ensure the failure path remains idempotent.
- The detached async invocation in `server.ts` swallows exceptions after logging to console. Tests rely on eventual completion, so a silent failure would leave the execution in `failed` state but tests might hang without additional polling safeguards.

## Next Steps

1. Author targeted tests for `runWithLangGraph` verifying success and failure transitions in `executionsStore` without needing the HTTP layer.
2. Confirm `runWithLangGraph` returns the serialized logs and response payload expected by `/api/execute` parity tests.
3. Update progress tracking and evidence files once validations are captured.
4. Run `AGENTS_RUNTIME=langgraph npm test -- tests/api/executions.test.ts` and related orchestrator tests to supply contract evidence after implementation updates.
