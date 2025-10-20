# Task P22-2.6 — Security Checklist Sweep for Proxies

## Execution Context (Read First)
- Project: UMCA Executor MVP
- Working Directory: `/Users/Yousef_1/Downloads/ai_system_executor-mvp`
- Prerequisites: P22-2.5 complete
- Estimated Time: 30-45 minutes

## Required Context Files
1. `docs/10_201025_todays_status/01_guides/security_checklist.md`

## Setup
```bash
npm install
pwd && git status --short
```

## Baseline Capture
```bash
rg -n 'AbortSignal\.timeout|respondWithProblem|BadGateway|UpstreamUnavailable' src/server.ts | tee /tmp/task_P22-2.6_baseline.txt
```

## Problem
- New proxies must comply with the security checklist (timeouts, sanitized errors, no secrets in logs, defaults OFF).

## Solution Steps
1) Review and ensure all proxies:
   - Enforce timeouts via AbortSignal.timeout
   - Map upstream failures to application/problem+json (respondWithProblem)
   - Avoid logging sensitive payloads
   - Are OFF unless URL envs are set
2) Add tests asserting problem+json envelopes for upstream 5xx and connection errors.

## Files To Modify
- src/server.ts (proxy helpers/routes added in P22-2.1..2.3)
- tests/api/*-proxy.test.ts (assertions)

## Validation
```bash
npm -s test -- tests/api/*-proxy.test.ts | tee /tmp/task_P22-2.6_tests.txt
```

## Decision Points (Error Handling)
- If tests show raw errors: ensure respondWithProblem envelopes are used and content-type is set to application/problem+json.

## Rollback Procedure (If Validation Fails)
```bash
git restore src/server.ts
```

## Evidence of Completion
```bash
mkdir -p .automation/evidence/P22-2.6
cat /tmp/task_P22-2.6_baseline.txt > .automation/evidence/P22-2.6/baseline_state.txt
cat /tmp/task_P22-2.6_tests.txt > .automation/evidence/P22-2.6/final_state.txt
```
