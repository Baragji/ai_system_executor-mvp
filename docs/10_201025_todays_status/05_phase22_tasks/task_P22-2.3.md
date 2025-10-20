# Task P22-2.3 — Monolith: Repair Proxy (REPAIR_URL)

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.2 complete
- Estimated Time: 30-45 minutes

## Required Context Files
1. `CLAUDE.md`
2. `ai-stack.json`

## Setup
```bash
npm install
pwd && git status --short
```

## Baseline Capture
```bash
rg -n 'REPAIR_URL' src/server.ts | tee /tmp/task_P22-2.3_baseline.txt
```

## Problem
- Monolith exposes internal repair flows but no external proxy; no REPAIR_URL handling present.

## Solution Steps (≤10 files)
1) Add helper `getRepairBase()` similar to others.
2) Add POST /api/repair proxy forwarding `${REPAIR_URL}/repair`.

### Code Snippets (paste into src/server.ts)
```ts
function getRepairBase(): string { return (process.env.REPAIR_URL || "").trim(); }
```

```ts
app.post("/api/repair", async (req, res) => {
  const base = getRepairBase(); const instance = req.originalUrl || req.url || "/api/repair";
  if (!base) { respondWithProblem(res, 501, "NotImplemented", "REPAIR_URL not configured", instance); return; }
  try {
    const fetchLike = (globalThis as any).fetch as FetchLike | undefined; if (!fetchLike) { respondWithProblem(res, 502, "UpstreamUnavailable", "fetch API not available in runtime", instance); return; }
    const target = new URL("/repair", `${base}/`).toString(); const controller = AbortSignal.timeout(120_000);
    const upstream = await fetchLike(target, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, application/problem+json" }, body: JSON.stringify(req.body ?? {}), signal: controller });
    const contentType = upstream.headers.get("content-type"); const raw = await upstream.text(); res.status(upstream.status); if (contentType) res.setHeader("Content-Type", contentType); if (raw.length > 0) res.send(raw); else res.end();
  } catch (error) { const message = (error as Error | undefined)?.message || "failed to reach repair"; respondWithProblem(res, 502, "BadGateway", message, instance); }
});
```

## Files To Modify
- src/server.ts (add helper + route)

## Validation
```bash
rg -n 'REPAIR_URL|getRepairBase|/api/repair' src/server.ts | tee /tmp/task_P22-2.3_grep.txt
npm -s test -- tests/api/repair-proxy.test.ts | tee /tmp/task_P22-2.3_tests.txt
```

## Decision Points (Error Handling)
- If proxy returns 404/500: confirm upstream service running and URL; verify problem+json envelope via tests.

## Rollback Procedure (If Validation Fails)
```bash
git restore src/server.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.3
cat /tmp/task_P22-2.3_baseline.txt > .automation/evidence/P22-2.3/baseline_state.txt
cat /tmp/task_P22-2.3_grep.txt /tmp/task_P22-2.3_tests.txt > .automation/evidence/P22-2.3/final_state.txt
```
