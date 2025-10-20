# Refactor Task 23: Extract Planning Endpoints to Planning Service

**Task ID**: REFACTOR-TASK-23
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-22
**Service**: planning
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "decomposeTask\(|executeTaskPlan\(|estimateCompletion" src/planning | head -n 20
rg -n "planning" tests | head -n 20
```

## Context
Move planning domain functions behind HTTP endpoints in the planning service:
- POST /decompose → `decomposeTask`
- POST /execute-plan → `executeTaskPlan`
Keep request/response shapes compatible with monolith.

## Implementation Steps

1) Add routes and handlers
- `services/planning/src/routes/decompose.ts`
- `services/planning/src/routes/executePlan.ts`

2) Wire routes in server
- Mount routes in `services/planning/src/server.ts`.

3) Unit tests
- Add tests that call the new routes and assert response structure.

## POST-EXECUTION VALIDATION

```bash
cd services/planning && npm run validate:all
```

## Rollback Procedure

```bash
git checkout -- services/planning/src
```

## Definition of Done
- [ ] /decompose and /execute-plan endpoints implemented and mounted
- [ ] validate:all passes for planning service
- [ ] Request/response parity maintained

