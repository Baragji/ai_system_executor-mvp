# Task P22-2.1 — Monolith: Clarification Proxy (CLARIFICATION_URL)

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-1.10 complete
- Estimated Time: 30-45 minutes

## Required Context Files (Read Before Starting)
1. `AGENTS.md`
2. `ai-stack.json`
3. `contracts/Roadmap_execution/22_phase22_service_extraction_contract.json`

## Stack Constraints (Enforced)
- TS/JS only; Node 20+; no Python; no framework drift; no API changes

## Setup (If Fresh Environment)
```bash
npm install
pwd && git status --short
```

## Prerequisites Validation
```bash
test -f .automation/evidence/P22-1.10/final_state.txt || { echo 'ERROR: P22-1.10 not complete'; exit 1; }
```

## Baseline Capture (Before Starting)
```bash
rg -n 'CLARIFICATION_URL' src/server.ts | tee /tmp/task_P22-2.1_baseline.txt
```

## Problem
- Monolith lacks opt-in proxy for Clarification API (POST /api/clarify).
- No CLARIFICATION_URL handling found:
  - src/server.ts:143 (getOrchestratorBase)
  - src/server.ts:146 (getRunnerBase)
  - src/server.ts:149 (getPlanningBase)
  - src/server.ts:1880 (local /api/clarify route)

## Solution Steps (≤10 files)
1) Add helper `getClarificationBase()` similar to existing getters.
2) Before local /api/clarify implementation, add proxy branch:
   - If CLARIFICATION_URL is set, forward to `${base}/clarify` with timeout and pass-through content-type.
   - On error, return problem+json 502 (BadGateway) using respondWithProblem().

### Code Insertion Anchors
- Search anchor: `app.post("/api/clarify"` in `src/server.ts` and insert the proxy branch immediately above it.
- Add helper near other `get*Base()` helpers.

### Example Snippets (paste into src/server.ts)
```ts
function getClarificationBase(): string { return (process.env.CLARIFICATION_URL || "").trim(); }
```

```ts
// At start of the clarify route handler
const CLARIFICATION_BASE = getClarificationBase();
if (CLARIFICATION_BASE) {
  const instance = req.originalUrl || req.url || "/api/clarify";
  try {
    const fetchLike = (globalThis as any).fetch as FetchLike | undefined;
    if (!fetchLike) { respondWithProblem(res, 502, "UpstreamUnavailable", "fetch API not available in runtime", instance); return; }
    const target = new URL("/clarify", CLARIFICATION_BASE).toString();
    const controller = AbortSignal.timeout(30_000);
    const upstream = await fetchLike(target, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, application/problem+json" }, body: JSON.stringify(req.body ?? {}), signal: controller });
    const contentType = upstream.headers.get("content-type"); const raw = await upstream.text(); res.status(upstream.status); if (contentType) res.setHeader("Content-Type", contentType); if (raw.length > 0) res.send(raw); else res.end(); return;
  } catch (error) {
    const message = (error as Error | undefined)?.message || "failed to reach clarification";
    respondWithProblem(res, 502, "BadGateway", message, instance); return;
  }
}
```

## Files To Modify
- src/server.ts:140-160 (add getter)
- src/server.ts:1880-1920 (insert proxy branch before local handler)

## Validation
```bash
rg -n 'CLARIFICATION_URL|getClarificationBase' src/server.ts | tee /tmp/task_P22-2.1_grep.txt
npm -s test -- tests/api/clarify-proxy.test.ts | tee /tmp/task_P22-2.1_tests.txt
```

## Decision Points (Error Handling)
- If tests fail: verify anchor locations and inserted code; ensure imports for FetchLike/types present.

## Rollback Procedure (If Validation Fails)
```bash
git restore src/server.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.1
cat /tmp/task_P22-2.1_baseline.txt > .automation/evidence/P22-2.1/baseline_state.txt
cat /tmp/task_P22-2.1_grep.txt /tmp/task_P22-2.1_tests.txt > .automation/evidence/P22-2.1/final_state.txt
```
