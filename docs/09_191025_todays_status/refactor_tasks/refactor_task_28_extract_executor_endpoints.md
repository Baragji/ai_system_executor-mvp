# Refactor Task 28: Extract Executor Endpoints to Executor Service

**Task ID**: REFACTOR-TASK-28
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-27
**Service**: executor
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "writeFiles\(|sanitizeOutput\(|validateFiles" src | head -n 20
rg -n "executor" tests | head -n 20
```

## Context
Expose executor operations via HTTP in the executor service:
- POST /generate → `writeFiles` + `sanitizeOutput`
- POST /validate → `validateFiles` and related checks
Maintain request/response parity with monolith.

## Implementation Steps

1) Add routes and handlers
- `services/executor/src/routes/generate.ts`
- `services/executor/src/routes/validate.ts`

2) Wire routes in server
- Mount in `services/executor/src/server.ts`.

3) Unit tests
- Add tests for both endpoints including error conditions.

## POST-EXECUTION VALIDATION

```bash
cd services/executor && npm run validate:all
```

## Rollback Procedure

```bash
git checkout -- services/executor/src
```

## Definition of Done
- [ ] /generate and /validate endpoints implemented and mounted
- [ ] validate:all passes for executor service
- [ ] Parity with monolith behavior maintained

