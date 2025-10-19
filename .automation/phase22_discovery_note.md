# Phase 22 Discovery Note — REFACTOR-TASK-15: Wire Monolith → Orchestrator (Proxy)

Date: 2025-10-19

Scope: Route-level proxy from monolith to external orchestrator service when `ORCHESTRATOR_URL` is set. Fallback to local behavior when unset.

## Integration Points

- File: `src/server.ts:520` — GET `/api/executions/:id`
  - Current behavior: reads in-memory execution via `getExecution(id)` and returns 404 using `respondWithProblem()` when missing.
  - Change: If `process.env.ORCHESTRATOR_URL` is set, proxy to `${ORCHESTRATOR_URL}/executions/:id` and relay status/body. On network failure, return RFC 9457 problem with 502 Bad Gateway.

- File: `src/server.ts:1568` — POST `/api/execute`
  - Current behavior: builds StepQueue step descriptors and either:
    - delegates to LangGraph when `AGENTS_RUNTIME=langgraph`, or
    - executes locally via `stepQueue.runWorkflow()`.
  - Change: After building `steps` and when `AGENTS_RUNTIME` is not `langgraph`, if `process.env.ORCHESTRATOR_URL` is set, POST `{ sessionId, steps }` to `${ORCHESTRATOR_URL}/execute` and relay response. If upstream sets a `Location: /executions/:id`, rewrite to `Location: /api/executions/:id` for client consistency. On network failure, return RFC 9457 problem with 502 Bad Gateway.

## Snippets (±10 lines)

- GET `/api/executions/:id` proxy branch (excerpt):

```
app.get("/api/executions/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  if (ORCHESTRATOR_BASE) {
    const instance = req.originalUrl || req.url || "/api/executions";
    try {
      const target = new URL(`/executions/${encodeURIComponent(id)}`, ORCHESTRATOR_BASE).toString();
      const upstream = await fetchLike(target, { method: "GET", headers: { accept: "application/json" } });
      const payload = await upstream.json().catch(() => ({ error: "invalid upstream response" }));
      res.status(upstream.status).json(payload as object);
      return;
    } catch (error) {
      respondWithProblem(res, 502, "BadGateway", "failed to reach orchestrator", instance);
      return;
    }
  }
  // fallback to local getExecution(...)
});
```

- POST `/api/execute` proxy branch (excerpt):

```
// after steps[] prepared and before local StepQueue execution
if (!useLangGraph && ORCHESTRATOR_BASE) {
  const upstream = await fetchLike(new URL("/execute", ORCHESTRATOR_BASE).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sessionId, steps })
  });
  const body = await upstream.json().catch(() => ({}));
  const loc = upstream.headers.get("location");
  if (loc) res.setHeader("Location", loc.startsWith("/executions/") ? `/api${loc}` : loc);
  res.status(upstream.status).json(body as object);
  return;
}
```

## Dependencies and Impacts

- No new dependencies introduced; uses Node 20 global `fetch` via a safe cast to avoid TS DOM lib requirements.
- Error handling continues to use `respondWithProblem()` to emit RFC 9457 problem+json in proxy failure cases.
- LangGraph path unchanged; proxy enables only when `AGENTS_RUNTIME != langgraph`.
- SSE remains local-only; when proxying, immediate 202 + Location is returned without SSE streaming.

## Compliance Check (ai-stack.json)

- Language: TypeScript ✅
- Backend: Express ✅
- Frontend: unchanged ✅
- Testing: existing suites remain valid; new behavior gated by env var ✅
- Linting: no new warnings introduced ✅
- No forbidden tech/deps added ✅

## Justification

- Keeps monolith behavior intact by default; only toggles proxy via `ORCHESTRATOR_URL` per rollout plan.
- Aligns with Phase 22 goal to extract StepQueue execution into the orchestrator service while preserving API contracts.
- Location header rewrite maintains client-facing `/api/executions/:id` consistency.

