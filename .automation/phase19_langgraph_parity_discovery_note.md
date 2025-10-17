# Phase 19 — LangGraph Parity for `/api/execute`

## Goal
- Preserve the existing synchronous `/api/execute` contract (status 200 + full payload) even when `AGENTS_RUNTIME=langgraph` is enabled.
- Persist execution results into the LangGraph executions store and surface them via `GET /api/executions/:id` so asynchronous polling works.

## Integration Points
- `src/server.ts:1536` — `POST /api/execute`
  - Feature flag currently short-circuits to `executeAdapterLanggraph` and skips the StepQueue pipeline entirely.
  - Snippet:
    ```ts
    if ((process.env.AGENTS_RUNTIME || "").toLowerCase() === "langgraph") {
      await executeAdapterLanggraph(req, res);
      return; // do not continue into default StepQueue pipeline
    }
    ```
- `src/orchestrator/executionsStore.ts:1` — in-memory executions store
  - Provides `createExecution`, `completeExecution`, `failExecution`, `listExecutions` for LangGraph polling.
  - Snippet:
    ```ts
    export function createExecution(id: string, initial?: Partial<Omit<ExecutionRecord, "id">>): ExecutionRecord {
      const ts = now();
      const record: ExecutionRecord = {
        id,
        status: initial?.status ?? "started",
        createdAt: initial?.createdAt ?? ts,
        updatedAt: initial?.updatedAt ?? ts,
        ...(initial?.result !== undefined ? { result: initial.result } : {})
      };
      executions.set(id, record);
      return record;
    }
    ```
- `tests/api/execute-multi-turn.test.ts:68` — representative integration test
  - Posts to `/api/execute` and expects immediate 200 status + repair history payload.
  - Snippet:
    ```ts
    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build demo", projectName: "multi-turn-demo" });

    expect(res.status).toBe(200);
    ```

## Proposed Changes
- Let the StepQueue pipeline run regardless of runtime, capture its payload, then:
  - When `AGENTS_RUNTIME=langgraph`, create an execution record, return `202 Accepted` + `Location`, and asynchronously complete the record with the captured payload.
  - Otherwise, keep the legacy `200 OK` response path.
- Update error handling to mark executions as failed when exceptions bubble out.
- Introduce a shared test helper that posts to `/api/execute`, follows a `202` Location if present, and returns the final payload for assertions.
- Refactor affected tests (multi-turn, clarifications, planning, telemetry, e2e) to use the helper so they validate identical payloads regardless of runtime.

## Dependencies / Impacts
- No new packages; reuse existing store + StepQueue pipeline.
- Ensures LangGraph feature flag no longer regresses core flows.
- Tests gain awareness of async polling semantics but still assert the same business data.

## Compliance Check
- Language: TypeScript ✅
- Backend: Node.js 20 + Express ✅
- Frontend: unchanged ✅
- Testing: Vitest suites updated with new helper ✅
- Linting: ESLint enforced ✅
- No protected files touched ✅

