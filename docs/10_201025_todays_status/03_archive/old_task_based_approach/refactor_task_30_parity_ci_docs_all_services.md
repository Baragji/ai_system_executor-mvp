# Refactor Task 30: Parity Validation + CI/QA + Docs (All Domain Services)

**Task ID**: REFACTOR-TASK-30
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-21..29
**Services**: planning, repair, executor, clarification, monolith
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
printenv PLANNING_URL || true
printenv REPAIR_URL || true
printenv EXECUTOR_URL || true
printenv CLARIFICATION_URL || true
```

## Context
Run validations for each domain service and the monolith. Do NOT force proxies during the full suite; run proxy tests separately (they set env internally). Update checklists and docs with the new services and environment variables.

## Implementation Steps

1) Per-service checks
```bash
cd services/planning && npm run validate:all && cd ../../
cd services/repair && npm run validate:all && cd ../../
cd services/executor && npm run validate:all && cd ../../
cd services/clarification && npm run validate:all && cd ../../
```

2) Root validations (no global proxies)
```bash
unset PLANNING_URL REPAIR_URL EXECUTOR_URL CLARIFICATION_URL
npm run validate:all
```

3) Proxy behavior (targeted tests)
```bash
vitest run tests/api/planning-proxy.test.ts || true
vitest run tests/api/repair-proxy.test.ts || true
vitest run tests/api/executor-proxy.test.ts || true
vitest run tests/api/clarify-route.test.ts
```

4) Documentation updates
- Update `docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md` with Tasks 21–30.
- Add env var notes: `PLANNING_URL`, `REPAIR_URL`, `EXECUTOR_URL`, `CLARIFICATION_URL`.

## POST-EXECUTION VALIDATION

```bash
rg -n "Task:.*(planning|repair|executor|clarification)" docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md
```

## Rollback Procedure

```bash
git checkout -- docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md
```

## Definition of Done
- [ ] All new services pass validate:all
- [ ] Root suite passes without global proxies
- [ ] Proxy tests pass in isolation
- [ ] Docs aligned with the new services and env vars

