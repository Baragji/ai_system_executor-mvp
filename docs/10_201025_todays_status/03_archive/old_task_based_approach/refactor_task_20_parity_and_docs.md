# Refactor Task 20: Parity Validation + Docs Alignment

**Task ID**: REFACTOR-TASK-20
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-12..19
**Service**: orchestrator, runner, monolith
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
printenv ORCHESTRATOR_URL || true
printenv RUNNER_URL || true
```

## Context
Ensure root validations still pass with services enabled. Align checklists/docs to reflect the new service architecture and proxy routing.

## Implementation Steps

1) Run root validations (without forcing proxies globally)
```bash
# Leave ORCHESTRATOR_URL and RUNNER_URL unset for full test parity
unset ORCHESTRATOR_URL
unset RUNNER_URL
npm run validate:all
```

1b) Verify proxy behavior with targeted tests only (these set env locally)
```bash
vitest run tests/api/orchestrator-proxy.test.ts
vitest run tests/run-tests-route.test.ts
```

2) Update docs/checklists
- Update `docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md` to mark Tasks 11–20 accordingly.
- Note new env vars and routing behavior.

## POST-EXECUTION VALIDATION

```bash
rg -n "Task:.*(orchestrator|runner)" docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md
```

## Rollback Procedure

```bash
git checkout -- docs/09_191025_todays_status/04_REFACTOR_STATUS_CHECKLIST.md
```

## Definition of Done
- [x] Root validate:all passes
- [x] Docs aligned with service extraction proxies (do not force proxies globally for full suite)
