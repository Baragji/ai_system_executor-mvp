# Refactor Task 17: Extract Runner Endpoints (run/install/test)

**Task ID**: REFACTOR-TASK-17
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-16
**Service**: runner
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "runInSandbox\(|installDeps\(|runTests\(" src/runner src | head -n 20
rg -n "run-tests-route" tests | head -n 10
```

## Context
Expose runner operations as HTTP endpoints in the runner service:
- POST /run
- POST /install
- POST /test
Wrap existing domain functions; maintain request/response parity.

## Implementation Steps

1) Add routes and domain wrappers
- Create `services/runner/src/routes/run.ts`, `install.ts`, `test.ts` calling existing domain logic.

2) Wire routes in server
- Mount routes in `services/runner/src/server.ts`.

## POST-EXECUTION VALIDATION

```bash
cd services/runner && npm run validate:all
curl -sfS http://localhost:3004/healthz
```

## Rollback Procedure

```bash
git checkout -- services/runner/src
```

## Definition of Done
- [ ] Runner endpoints implemented and mounted
- [ ] validate:all passes for runner service
- [ ] Root tests referencing run-tests still pass
