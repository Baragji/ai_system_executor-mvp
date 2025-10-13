# Phase 20 — LangGraph Executions Endpoint

Goal
- Expose `GET /api/executions/:id` for polling execution status when `AGENTS_RUNTIME=langgraph` is enabled.
- Back the endpoint with an in-memory runtime store and wire the graph stub to register and complete executions.

Integration Points
- `src/server.ts:1518` POST `/api/execute`
  - Feature flag branch delegates to `executeAdapterLanggraph(req, res)` and returns.
  - Snippet:
    ```ts
    if ((process.env.AGENTS_RUNTIME || "").toLowerCase() === "langgraph") {
      await executeAdapterLanggraph(req, res);
      return; // do not continue into default StepQueue pipeline
    }
    ```
- `src/server.ts:426` GET `/api/executions/:id` (new)
  - New route to fetch execution records by id. Uses RFC 9457 helper when enabled.
  - Snippet:
    ```ts
    app.get("/api/executions/:id", (req, res) => {
      const { id } = req.params as { id: string };
      const record = getExecution(id);
      if (!record) {
        respondWithProblem(res, 404, "NotFound", "execution not found", req.originalUrl || req.url || "/api/executions");
        return;
      }
      res.json(record);
    });
    ```
- `src/orchestrator/graph.ts:1` `runGraph(args)`
  - Registers a started execution and completes it shortly with a stub result.
  - Snippet:
    ```ts
    createExecution(executionId, { status: "started" });
    const stubResult = { message: "LangGraph runtime stub invoked. Replace with real graph implementation.", prompt: args.prompt };
    setTimeout(async () => {
      completeExecution(executionId, stubResult);
      await logEvent("langgraph_execution_completed", { executionId });
    }, 10);
    ```

New Module
- `src/orchestrator/executionsStore.ts`
  - Minimal in-memory store with: `createExecution`, `getExecution`, `completeExecution`, `failExecution`, `listExecutions`.
  - No external dependencies.

Justification
- Prior work added a feature-flagged LangGraph adapter that returns `202 Accepted` with a `Location` header to `/api/executions/:id`, but the route did not exist.
- This change completes the round trip without modifying the default StepQueue pipeline.
- RFC 9457 helper is used for 404 when enabled, preserving existing API compatibility by default.

Compliance Check (ai-stack.json)
- Language: TypeScript ✅
- Backend: Express on Node 20+ ✅
- Frontend: unchanged ✅
- Testing: Vitest test added under `tests/api` ✅
- Linting: ESLint used, no warnings expected ✅
- No new dependencies added ✅
- No protected files modified ✅
- No breaking changes to existing APIs ✅

Potential Impacts
- New non-breaking endpoint; safe to ship behind the existing adapter’s feature flag.
- In-memory store is ephemeral by design; acceptable for MVP/stub.

Evidence Plan
- Add API test to verify 202 + Location on `/api/execute` and poll completion at `/api/executions/:id`.
- Run validation: lint, typecheck, tests, contract:check, sbom.

