# Refactor Task 26: Extract Repair Endpoints to Repair Service

**Task ID**: REFACTOR-TASK-26
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-25
**Service**: repair
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "analyzeFailure\(|repairOnce\(|multiTurnRepair" src/repair | head -n 20
rg -n "repair" tests | head -n 20
```

## Context
Expose repair domain operations via HTTP in the repair service:
- POST /analyze → `analyzeFailure`
- POST /repair → `multiTurnRepair` (bounded attempts) or `repairOnce`
Maintain request/response parity.

## Implementation Steps

1) Add routes and handlers
- `services/repair/src/routes/analyze.ts`
- `services/repair/src/routes/repair.ts`

2) Wire routes in server
- Mount routes in `services/repair/src/server.ts`.

3) Unit tests
- Add tests for both endpoints, including fail paths.

## POST-EXECUTION VALIDATION

```bash
cd services/repair && npm run validate:all
```

## Rollback Procedure

```bash
git checkout -- services/repair/src
```

## Definition of Done
- [ ] /analyze and /repair endpoints implemented and mounted
- [ ] validate:all passes for repair service
- [ ] Parity with monolith behavior

