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

1) Run root validations
```bash
export ORCHESTRATOR_URL=${ORCHESTRATOR_URL:-http://localhost:3005}
export RUNNER_URL=${RUNNER_URL:-http://localhost:3004}
npm run validate:all
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
- [ ] Root validate:all passes
- [ ] Docs aligned with service extraction proxies
