# Refactor Task 18: Wire Monolith → Runner Service (Proxy)

**Task ID**: REFACTOR-TASK-18
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-16..17
**Service**: monolith → runner
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: Medium

## PRE-EXECUTION VALIDATION

```bash
rg -n "/api/run-tests|/api/run|/api/install|/api/test" src/server.ts
printenv RUNNER_URL || echo "RUNNER_URL unset (expected)"
```

## Context
Add `RUNNER_URL` env var and route monolith run/install/test operations to runner service when set; fallback to legacy when unset.

## Implementation Steps

1) Add env + health check
- Introduce `RUNNER_URL` and optional health probe.

2) Proxy routes
- Proxy POST `/api/run-tests` (and other runner endpoints) to service while preserving current response shape and RFC 9457 errors.

## POST-EXECUTION VALIDATION

```bash
export RUNNER_URL=http://localhost:3004
npm run dev & sleep 2
curl -sS -X POST http://localhost:3000/api/run-tests -H 'content-type: application/json' -d '{"project":"fixtures/passing"}'
```

## Rollback Procedure

```bash
git checkout -- src/server.ts
```

## Definition of Done
- [ ] RUNNER_URL supported
- [ ] Monolith proxies run/install/test to runner
- [ ] Root tests pass
