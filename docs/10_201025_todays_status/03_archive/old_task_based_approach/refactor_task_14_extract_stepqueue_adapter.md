# Refactor Task 14: Extract StepQueue Adapter to Orchestrator

**Task ID**: REFACTOR-TASK-14
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-13
**Service**: orchestrator
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "class StepQueue|runWorkflow\(" src/orchestrator src/server.ts
rg -n "runWorkflow\(" tests | head -n 10
```

## Context
Move a thin StepQueue adapter into the orchestrator service so /execute can delegate execution without LangGraph changes. Keep implementation 1:1 with current behavior.

## Implementation Steps

1) Create adapter
- `services/orchestrator/src/domain/stepQueueAdapter.ts` exposing `runWorkflow(sessionId, steps, hooks)` by importing or replicating non-UI logic from monolith.

2) Wire adapter
- Update `services/orchestrator/src/routes/execute.ts` to call the adapter and update the executions store hooks on step events.

## POST-EXECUTION VALIDATION

```bash
cd services/orchestrator && npm run validate:all
AGENTS_RUNTIME=stepqueue npm test tests/benchmarks/perf-overhead.test.ts
```

## Rollback Procedure

```bash
git checkout -- services/orchestrator/src/domain/stepQueueAdapter.ts
```

## Definition of Done
- [ ] StepQueue adapter implemented in orchestrator service
- [ ] /execute uses adapter; logs/outputs recorded
- [ ] Root tests still pass (parity)
