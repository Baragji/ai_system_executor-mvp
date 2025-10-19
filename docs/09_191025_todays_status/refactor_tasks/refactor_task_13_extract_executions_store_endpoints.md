# Refactor Task 13: Extract Executions Store + Endpoints to Orchestrator

**Task ID**: REFACTOR-TASK-13
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-12
**Service**: orchestrator
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "updateExecution\(|completeExecution\(|failExecution\(" src | head -n 20
rg -n "POST /api/execute|GET /api/executions" tests | head -n 10
```

## Context
Move the executions store and the execution endpoints into the orchestrator service:
- POST /execute → 202 + Location header
- GET /executions/:id → execution status and logs
Maintain parity with monolith behavior; monolith will proxy later.

## Implementation Steps

1) Copy minimal store
- Create `services/orchestrator/src/domain/executionsStore.ts` implementing in-memory storage compatible with existing fields.

2) Add routes
- `services/orchestrator/src/routes/execute.ts` (POST /execute): generate id, set running status, enqueue via StepQueue adapter (placeholder), respond 202 + Location.
- `services/orchestrator/src/routes/executions.ts` (GET /executions/:id): return current status/output/logs.

3) Wire routes in server
- Mount /execute and /executions in `services/orchestrator/src/server.ts`.

## POST-EXECUTION VALIDATION

```bash
cd services/orchestrator && npm run validate:all
node -e "console.log('ok')" && echo "Health:" && curl -sfS http://localhost:3005/healthz || true
```

## Rollback Procedure

```bash
git checkout -- services/orchestrator/src
```

## Definition of Done
- [ ] Executions store implemented in orchestrator service
- [ ] /execute and /executions endpoints live
- [ ] validate:all passes for orchestrator service
