# Task P22-3.2 — Parity Tests: 202 + Location + Polling

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-3.1 complete
- Estimated Time: 30-45 minutes

## Required Context Files
1. `AGENTS.md`
2. `ai-stack.json`

## Setup
```bash
npm install
```

## Problem
- Need explicit parity tests ensuring monolith proxies and orchestrator service behavior align (202 + Location + GET polling to completion).

## Solution Steps (≤10 files)
1) Add tests under root:
   - tests/api/executions.test.ts — POST /api/execute returns 202 + Location; polling returns 200 with final payload.
   - Test with and without ORCHESTRATOR_URL env to cover proxy and local paths.
2) Verify Location rewriting in monolith (upstream '/executions/:id' → '/api/executions/:id').

## Files To Modify
- tests/api/executions.test.ts:1-240 (add or extend)

## Validation
```bash
npm -s test -- tests/api/executions.test.ts | tee /tmp/task_P22-3.2_tests.txt
```

## Decision Points (Error Handling)
- If proxy path fails: verify ORCHESTRATOR_URL is set and health is OK; confirm Location header rewrite in assertions.

## Rollback Procedure (If Validation Fails)
```bash
git restore tests/api/executions.test.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-3.2
cat /tmp/task_P22-3.2_tests.txt > .automation/evidence/P22-3.2/final_state.txt
```
