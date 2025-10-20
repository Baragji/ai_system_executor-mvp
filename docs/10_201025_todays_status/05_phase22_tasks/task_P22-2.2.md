# Task P22-2.2 — Monolith: Executor Proxy (EXECUTOR_URL)

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.1 complete
- Estimated Time: 30-45 minutes

## Required Context Files
1. `CLAUDE.md`
2. `ai-stack.json`
3. `contracts/Roadmap_execution/22_phase22_service_extraction_contract.json`

## Setup
```bash
npm install
pwd && git status --short
```

## Baseline Capture
```bash
rg -n 'EXECUTOR_URL' src/server.ts | tee /tmp/task_P22-2.2_baseline.txt
```

## Problem
- No opt-in proxy for executor service endpoints; monolith lacks EXECUTOR_URL handling.

## Solution Steps (≤10 files)
1) Add helper `getExecutorBase()` (mirrors getRunnerBase pattern).
2) Add additive proxy routes (do not break existing API):
   - POST /api/executor/generate → `${EXECUTOR_URL}/generate`
   - POST /api/executor/validate → `${EXECUTOR_URL}/validate`
   - Use AbortSignal timeouts and respondWithProblem() on errors.

### Code Snippets (paste into src/server.ts)
```ts
function getExecutorBase(): string { return (process.env.EXECUTOR_URL || "").trim(); }
```

```ts
app.post("/api/executor/generate", async (req, res) => {
  const base = getExecutorBase(); const instance = req.originalUrl || req.url || "/api/executor/generate";
  if (!base) { respondWithProblem(res, 501, "NotImplemented", "EXECUTOR_URL not configured", instance); return; }
  try {
    const fetchLike = (globalThis as any).fetch as FetchLike | undefined; if (!fetchLike) { respondWithProblem(res, 502, "UpstreamUnavailable", "fetch API not available in runtime", instance); return; }
    const target = new URL("/generate", `${base}/`).toString(); const controller = AbortSignal.timeout(60_000);
    const upstream = await fetchLike(target, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, application/problem+json" }, body: JSON.stringify(req.body ?? {}), signal: controller });
    const contentType = upstream.headers.get("content-type"); const raw = await upstream.text(); res.status(upstream.status); if (contentType) res.setHeader("Content-Type", contentType); if (raw.length > 0) res.send(raw); else res.end();
  } catch (error) { const message = (error as Error | undefined)?.message || "failed to reach executor"; respondWithProblem(res, 502, "BadGateway", message, instance); }
});

app.post("/api/executor/validate", async (req, res) => {
  const base = getExecutorBase(); const instance = req.originalUrl || req.url || "/api/executor/validate";
  if (!base) { respondWithProblem(res, 501, "NotImplemented", "EXECUTOR_URL not configured", instance); return; }
  try {
    const fetchLike = (globalThis as any).fetch as FetchLike | undefined; if (!fetchLike) { respondWithProblem(res, 502, "UpstreamUnavailable", "fetch API not available in runtime", instance); return; }
    const target = new URL("/validate", `${base}/`).toString(); const controller = AbortSignal.timeout(60_000);
    const upstream = await fetchLike(target, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, application/problem+json" }, body: JSON.stringify(req.body ?? {}), signal: controller });
    const contentType = upstream.headers.get("content-type"); const raw = await upstream.text(); res.status(upstream.status); if (contentType) res.setHeader("Content-Type", contentType); if (raw.length > 0) res.send(raw); else res.end();
  } catch (error) { const message = (error as Error | undefined)?.message || "failed to reach executor"; respondWithProblem(res, 502, "BadGateway", message, instance); }
});
```

## Files To Modify
- src/server.ts (add helper + 2 new routes)

## Validation
```bash
rg -n 'EXECUTOR_URL|getExecutorBase|/api/executor/(generate|validate)' src/server.ts | tee /tmp/task_P22-2.2_grep.txt
npm -s test -- tests/api/executor-proxy.test.ts | tee /tmp/task_P22-2.2_tests.txt
```

## Decision Points (Error Handling)
- If tests fail: verify helper and routes inserted at correct locations; ensure FetchLike typing/imports available; fallback to rollback.

## Rollback Procedure (If Validation Fails)
```bash
git restore src/server.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.2
cat /tmp/task_P22-2.2_baseline.txt > .automation/evidence/P22-2.2/baseline_state.txt
cat /tmp/task_P22-2.2_grep.txt /tmp/task_P22-2.2_tests.txt > .automation/evidence/P22-2.2/final_state.txt
```
