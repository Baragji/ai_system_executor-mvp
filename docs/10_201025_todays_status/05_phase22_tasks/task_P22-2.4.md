# Task P22-2.4 — Monolith: LLM Gateway Client Toggle (LLM_GATEWAY_URL)

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.3 complete
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
rg -n 'LLM_GATEWAY_URL' src/llm/index.ts | tee /tmp/task_P22-2.4_baseline.txt
```

## Problem
- generateJSON in monolith always uses local provider; no HTTP path to LLM Gateway when available.
- Target injection point: src/llm/index.ts:1-480 (generateJSON function).

## Solution Steps (≤10 files)
1) Add optional branch in generateJSON:
   - If `process.env.LLM_GATEWAY_URL` is set and truthy, call `${LLM_GATEWAY_URL}/complete` using `curlFetch()` (src/utils/curlFetch.ts:1) with the same request payload semantics.
   - Preserve local provider path as default.
2) Add unit test mocking curlFetch to ensure the gateway path is used when env is set.

### Code Snippet (insert near start of generateJSON)
```ts
const gatewayBase = (process.env.LLM_GATEWAY_URL || "").trim();
if (gatewayBase) {
  const url = new URL("/complete", `${gatewayBase}/`).toString();
  const body = { messages, options: { tools: options.tools, sessionId: options.sessionId } };
  const resp = await (await import("../utils/curlFetch.js")).curlFetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), timeoutMs: 60_000 });
  if (!resp.ok) throw new Error(`LLM Gateway failed with status ${resp.status}`);
  const content = await resp.text(); return content;
}
```

## Files To Modify
- src/llm/index.ts:1-480
- tests/llm/gateway-toggle.test.ts (new)

## Validation
```bash
rg -n 'LLM_GATEWAY_URL' src/llm/index.ts | tee /tmp/task_P22-2.4_grep.txt
npm -s test -- tests/llm/gateway-toggle.test.ts | tee /tmp/task_P22-2.4_tests.txt
```

## Decision Points (Error Handling)
- If gateway call fails in tests: mock curlFetch; ensure env var is set; verify request body shape.

## Rollback Procedure (If Validation Fails)
```bash
git restore src/llm/index.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.4
cat /tmp/task_P22-2.4_baseline.txt > .automation/evidence/P22-2.4/baseline_state.txt
cat /tmp/task_P22-2.4_grep.txt /tmp/task_P22-2.4_tests.txt > .automation/evidence/P22-2.4/final_state.txt
```
