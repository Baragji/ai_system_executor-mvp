# Refactor Task 24: Wire Monolith → Planning Service (Proxy)

**Task ID**: REFACTOR-TASK-24
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-22..23
**Service**: monolith → planning
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "/api/plan|decompose|execute-plan" src/server.ts | head -n 20 || true
printenv PLANNING_URL || echo "PLANNING_URL unset (expected)"
```

## Context
Add `PLANNING_URL` and route monolith planning calls to the planning service when set; fallback to legacy when unset. Preserve RFC9457 errors and headers.

## Implementation Steps

1) Add env + optional health probe
- Introduce `PLANNING_URL` and log when proxy enabled.

2) Proxy planning routes
- Forward payload to `/decompose` or `/execute-plan` and pass-through content-type and status codes.

## POST-EXECUTION VALIDATION

```bash
export PLANNING_URL=http://localhost:3002
vitest run tests/planning/*.test.ts
```

## Rollback Procedure

```bash
git checkout -- src/server.ts
```

## Definition of Done
- [ ] PLANNING_URL supported
- [ ] Monolith proxies planning calls to planning service
- [ ] Planning tests pass

